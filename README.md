# DGITI - Evaluacion final: infraestructura AWS con Terraform

API minima en Node.js + PostgreSQL desplegada en AWS (ALB + Auto Scaling Group + RDS con replica),
provisionada con Terraform y desplegada con GitHub Actions.

- Repositorio: https://github.com/sergioguerrasu-gif/GDIT (debe seguir **publico**: las instancias hacen `git clone` por HTTPS)
- Documentacion de la API (Swagger UI): `http://<alb_dns_name>/docs`

## Arquitectura

```
Internet -> ALB :80 (subredes publicas) -> ASG 2-4 x EC2 :3000 (subredes privadas) -> RDS PostgreSQL :5432
                                                                                      \-> Replica de lectura
```

- **Red:** VPC con 2 subredes publicas y 2 privadas en 2 AZ, Internet Gateway y 1 NAT Gateway.
- **Seguridad:** Security Groups encadenados. Internet -> ALB (80) -> EC2 (3000, solo desde el SG del ALB) -> RDS (5432, solo desde el SG de la app).
  La salida de las instancias se limita a 443 y 80 (git, npm, dnf via NAT) y 5432 (dentro de la VPC).
- **Datos:** RDS PostgreSQL 16 privado y cifrado, con replica de lectura, y un bucket S3 privado.
- **Computo:** ALB, Launch Template (Amazon Linux 2023, `LabInstanceProfile`) y ASG de 2 a 4 instancias con health check ELB,
  escalado por CPU al 50 % e `instance_refresh`.
- **Monitoreo:** 2 alarmas de CloudWatch y 1 dashboard (ver `terraform output cloudwatch_dashboard`).

## Estructura

```
app/        API Express (endpoints, Swagger) + pruebas
infra/      Terraform: provider.tf, variables.tf, main.tf, outputs.tf, terraform.tfvars.example, user_data.sh
k6/         Prueba de carga
scripts/    check-balancer.sh (reparto del ALB entre instancias)
.github/    Pipeline CI/CD
```

## Endpoints

| Endpoint | Para que sirve |
|---|---|
| `GET /health` | Health check del ALB (no depende de la BD) |
| `GET /api/test` | Valida app -> RDS primaria (escritura) y lectura desde la replica |
| `GET/POST /api/items` | CRUD minimo (escribe en primaria, lee de la replica) |
| `GET /api/load?ms=30` | Gasta CPU a proposito para la prueba de carga |
| `GET /docs` | Swagger UI |
| `GET /openapi.json` | Especificacion OpenAPI |

Todas las respuestas incluyen el header `X-Instance` con el id de la instancia que atendio la peticion.
Sin base de datos la API arranca igual y reintenta conectarse, pero `/api/test` y `/api/items` responden 503.

## Desarrollo local

Requiere Node 20 y un PostgreSQL local. Los comandos de npm se ejecutan **desde `app/`**.

```bash
# 1. Base de datos local (una sola vez)
psql postgres -c "CREATE ROLE dgiti LOGIN PASSWORD 'dgiti123';"
psql postgres -c "CREATE DATABASE dgiti_db OWNER dgiti;"

# 2. API
cd app
npm install
set -a; . ./.env.example; set +a     # PORT=3100, DB_*
npm run dev                          # http://localhost:3100/docs
```

El puerto 3100 evita choques con otros proyectos que usen el 3000. Otros scripts:

```bash
npm start        # arranque normal
npm run lint     # eslint
npm test         # node --test (BD simulada, no necesita Postgres)
```

## Despliegue con Terraform

Requiere Terraform >= 1.5 y credenciales de AWS Academy exportadas (`AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`). Cambian en cada sesion del lab.

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # editar repo_url y db_password
terraform init
terraform plan
terraform apply
terraform output
```

`db_password` debe tener minimo 8 caracteres y no incluir `@`, `/`, `"` ni espacios.
`terraform.tfvars` esta en `.gitignore`: no se sube al repositorio.

## Pipeline CI/CD (GitHub Actions)

Archivo: `.github/workflows/ci-cd.yml`. Corre en cada push y pull request a `main`.

| Job | Que hace | Cuando |
|---|---|---|
| `app` | `npm ci`, `npm run lint`, `npm test` | siempre |
| `terraform` | `terraform fmt -check`, `init -backend=false`, `validate` | siempre |
| `deploy` | `aws autoscaling start-instance-refresh` sobre el ASG y espera a que termine | solo en `main`, tras pasar `app` y `terraform` |

El instance refresh reemplaza las instancias; las nuevas clonan la ultima version de `main`.

### Configurar el despliegue

En el repositorio: **Settings > Secrets and variables > Actions**.

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` | credencial del lab |
| Secret | `AWS_SECRET_ACCESS_KEY` | credencial del lab |
| Secret | `AWS_SESSION_TOKEN` | credencial del lab |
| Variable | `ASG_NAME` | `terraform output -raw asg_name` |
| Variable (opcional) | `AWS_REGION` | por defecto `us-east-1` |

Si faltan los secrets o `ASG_NAME`, el job `deploy` omite sus pasos con un aviso y no falla.
Las credenciales de AWS Academy **caducan al terminar la sesion del lab**: hay que actualizar los tres secrets
antes de cada despliegue, o el refresh fallara con `ExpiredToken`.

## Prueba de carga y balanceo

```bash
BASE_URL=http://<alb_dns_name> k6 run k6/load-test.js
./scripts/check-balancer.sh http://<alb_dns_name> 30
```

`k6/load-test.js` calienta, sube a carga normal y luego a un pico sobre `/api/load` para forzar el escalado del ASG.
`check-balancer.sh` cuenta cuantas peticiones atiende cada instancia (header `X-Instance`).
Mientras corre k6, observa el dashboard y las alarmas en CloudWatch.

## Limpieza (importante: ahorra creditos del lab)

```bash
cd infra && terraform destroy
```
