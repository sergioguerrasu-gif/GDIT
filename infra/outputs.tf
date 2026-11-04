output "alb_dns_name" {
  description = "DNS del balanceador de carga"
  value       = aws_lb.this.dns_name
}

output "app_url" {
  description = "URL base del servicio"
  value       = "http://${aws_lb.this.dns_name}"
}

output "health_url" {
  description = "Endpoint de validacion"
  value       = "http://${aws_lb.this.dns_name}/health"
}

output "test_url" {
  description = "Endpoint que valida la conexion a la base de datos"
  value       = "http://${aws_lb.this.dns_name}/api/test"
}

output "vpc_id" {
  description = "ID de la VPC"
  value       = aws_vpc.main.id
}

output "asg_name" {
  description = "Nombre del Auto Scaling Group (lo usa el pipeline para el despliegue)"
  value       = aws_autoscaling_group.app.name
}

output "rds_primary_endpoint" {
  description = "Endpoint de la base de datos primaria (solo accesible desde la VPC)"
  value       = aws_db_instance.primary.address
}

output "rds_replica_endpoint" {
  description = "Endpoint de la replica de lectura (solo accesible desde la VPC)"
  value       = var.create_replica ? aws_db_instance.replica[0].address : "sin replica"
}

output "s3_bucket" {
  description = "Bucket S3 de almacenamiento"
  value       = aws_s3_bucket.assets.bucket
}

output "cloudwatch_dashboard" {
  description = "Nombre del dashboard de CloudWatch"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}
