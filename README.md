# auto-site-template README

Simple site template for providing TOS and auto-listing of Apache index
directories.

This is a template project, so it is expected that you will copy the files
you need and start your own little project. There are really only a few
files to be interested in:

1. README.md - this file
2. start.html - the HTML file you will link to
3. start.js - the JavaScript referred to be start.html
4. Vagrantfile - a simple way to test start.html under Apache using Vagrant
5. .provision.sh - the provisioning script used by VagrantFile
6 .index.html - a new default index for Apache for our testing (used by .provision.sh)
