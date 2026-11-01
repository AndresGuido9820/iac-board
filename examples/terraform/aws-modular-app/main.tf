module "network" {
  source = "./modules/network"
}

module "data" {
  source = "./modules/data"
}

module "compute" {
  source = "./modules/compute"
}
