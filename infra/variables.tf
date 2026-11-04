variable "aws_region" {
  description = "Region de AWS (AWS Academy normalmente usa us-east-1)"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo para nombrar todos los recursos"
  type        = string
  default     = "dgiti"
}

variable "vpc_cidr" {
  description = "CIDR de la VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDRs de las subredes publicas (ALB y NAT), una por AZ"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDRs de las subredes privadas (EC2 y RDS), una por AZ"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "instance_type" {
  description = "Tipo de instancia EC2 del Auto Scaling Group"
  type        = string
  default     = "t3.micro"
}

variable "asg_min_size" {
  description = "Minimo de instancias (2 para alta disponibilidad)"
  type        = number
  default     = 2
}

variable "asg_desired_capacity" {
  description = "Instancias deseadas al iniciar"
  type        = number
  default     = 2
}

variable "asg_max_size" {
  description = "Maximo de instancias al escalar bajo carga"
  type        = number
  default     = 4
}

variable "cpu_target_percent" {
  description = "CPU promedio objetivo para el escalado automatico"
  type        = number
  default     = 50
}

variable "app_port" {
  description = "Puerto en el que escucha la API"
  type        = number
  default     = 3000
}

variable "repo_url" {
  description = "URL HTTPS del repositorio publico en GitHub (las instancias lo clonan al arrancar)"
  type        = string
}

variable "repo_branch" {
  description = "Rama del repositorio a desplegar"
  type        = string
  default     = "main"
}

variable "db_name" {
  description = "Nombre de la base de datos"
  type        = string
  default     = "appdb"
}

variable "db_username" {
  description = "Usuario administrador de PostgreSQL"
  type        = string
  default     = "appuser"
}

variable "db_password" {
  description = "Contrasena de PostgreSQL (minimo 8 caracteres, sin @ / \" ni espacios)"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "Clase de instancia RDS"
  type        = string
  default     = "db.t3.micro"
}

variable "create_replica" {
  description = "Crear la replica de lectura de RDS (requerida por la rubrica)"
  type        = bool
  default     = true
}
