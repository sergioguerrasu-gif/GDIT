# DGITI - Evaluacion final: infraestructura AWS con Terraform

API minima en Node.js + PostgreSQL desplegada en AWS (ALB + Auto Scaling Group + RDS con replica),
provisionada con Terraform y desplegada con GitHub Actions.

## Estructura

```
app/        API Express (endpoints /health, /api/test, /api/items, /api/load) + pruebas
infra/      Terraform: provider.tf, variables.tf, main.tf, outputs.tf, terraform.tfvars.example, user_data.sh
k6/         Prueba de carga
scripts/    check-balancer.sh (reparto del ALB entre instancias)
.github/    Pipeline CI/CD
```

## Endpoints

| Endpoint | Para que sirve |
|---|---|
| `GET /health` | Health check del ALB (no depende de la BD) |
| `GET /api/test` | Valida app -> RDS primaria y lectura desde la replica |
| `GET/POST /api/items` | CRUD minimo (escribe en primaria, lee de la replica) |
| `GET /api/load?ms=30` | Gasta CPU a proposito para la prueba de carga |

## Despliegue

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # editar repo_url y db_password
terraform init
terraform plan
terraform apply
terraform output
```

## Prueba de carga

```bash
BASE_URL=http://<alb_dns_name> k6 run k6/load-test.js
./scripts/check-balancer.sh http://<alb_dns_name> 30
```

## Limpieza (importante: ahorra creditos del lab)

```bash
cd infra && terraform destroy
```
