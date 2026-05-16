resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"
}

resource "aws_internet_gateway" "edge" {
  vpc_id = aws_vpc.main.id
}

resource "aws_nat_gateway" "egress" {
  subnet_id = aws_subnet.public.id
}

resource "aws_security_group" "database" {
  name   = "database-access"
  vpc_id = aws_vpc.main.id
}

resource "aws_db_subnet_group" "database" {
  name       = "database-subnets"
  subnet_ids = [aws_subnet.private.id]
}

resource "aws_db_instance" "primary" {
  identifier             = "primary-db"
  db_subnet_group_name   = aws_db_subnet_group.database.name
  vpc_security_group_ids = [aws_security_group.database.id]
}
