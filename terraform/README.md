## Terraform setup

--- 

### Install Terraform

Choose the appropriate download for your machine [here](https://developer.hashicorp.com/terraform/downloads?product_intent=terraform).

---

### Set environment variables

Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

Windows
```
$ set AWS_ACCESS_KEY_ID=xxx
$ set AWS_SECRET_ACCESS_KEY=xxx
```

Mac (not sure if this works)
```
$ export AWS_ACCESS_KEY_ID=xxx
$ export AWS_SECRET_ACCESS_KEY=xxx

```

---

### Commands


#### Terraform commands (in order)

- `$ terraform init` to initialise
- `$ terraform fmt` to format files
- `$ terraform plan` to gloss over changes made to make sure nothing will break
- `$ terraform apply` to deploy on AWS
- `$ terraform destroy` to terminate instances