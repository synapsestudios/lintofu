# no-winrm-connection

Flag `connection` blocks with `type = "winrm"`. Use `type = "ssh"` instead.

## Why

The [`winrm` connection type](https://opentofu.org/docs/language/resources/provisioners/connection/) is deprecated in OpenTofu 1.12 and slated for removal in 1.13. Configurations that still rely on it will break on upgrade. The supported transport is `ssh`, which Windows targets can serve via the OpenSSH server. Only literal `type = "winrm"` values are flagged; a `type` set from a variable or interpolation is left alone because its value is not known statically.

## What it flags

```hcl
resource "aws_instance" "web" {
  provisioner "remote-exec" {
    connection {
      type = "winrm"                 # flagged
      host = self.public_ip
      user = "Administrator"
    }
    inline = ["echo hi"]
  }
}

resource "aws_instance" "web" {
  connection {
    type = "winrm"                   # flagged
    host = self.public_ip
  }
}
```

Accepted:

```hcl
resource "aws_instance" "web" {
  connection {
    type = "ssh"
    host = self.public_ip
  }
}

resource "aws_instance" "web" {
  connection {
    host = self.public_ip            # defaults to ssh
  }
}

resource "aws_instance" "web" {
  connection {
    type = "${var.conn_type}"        # dynamic value, skipped
    host = self.public_ip
  }
}
```

## Autofix

None. Swapping `winrm` for `ssh` is a manual change. The two transports use different authentication, host, and port settings, so the surrounding `connection` attributes have to change too.

## Options

None.
