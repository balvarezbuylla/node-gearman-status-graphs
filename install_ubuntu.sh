#!/bin/bash

printf "\tChecking dependencies\n"

command -v node >/dev/null 2>&1          || { echo "Install node:           apt-get install nodejs"        >&2; exit 1; }
command -v npm  >/dev/null 2>&1          || { echo "Install npm:            apt-get install npm"           >&2; exit 1; }

printf "\tCopying files\n"

mkdir -p /opt/node-gearman-status-graphs/views
mkdir -p /opt/node-gearman-status-graphs/etc/init

cp package.json     /opt/node-gearman-status-graphs/
cp *.js             /opt/node-gearman-status-graphs/
cp README.md        /opt/node-gearman-status-graphs/
cp views/*.ejs      /opt/node-gearman-status-graphs/views/

cp etc/init/*.conf                    /etc/init/

mkdir -p /etc/

if [ -f /etc/gearman_status.conf ]
then
  cp etc/gearman_status.conf /etc/gearman_status.conf.new
else
  cp etc/gearman_status.conf /etc/gearman_status.conf
fi


pushd /opt/node-gearman-status-graphs/
npm install -d
popd

printf "\n"
printf "\tCheck configuration files:\n"
printf "\t\t/etc/gearman_status.conf\n"
printf "\tStart service with:\n"
printf "\t\t start gearman_status\n"
printf "\n"
