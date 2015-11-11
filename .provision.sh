#!/bin/bash

sudo apt-get -y install apache2
sudo ln -s /vagrant /var/www/html/
sudo cp /vagrant/.index.html /var/www/html/index.html
