filpilote
=========

Web interface for remote control of heaters.

Install
=======

Starting from a new Raspbian install.

* Allow user to write Raspberry Pi GPIO:

`sudo usermod -a -G gpio pi`

* Since Raspbian has old nodejs/npm versions, [install a recent version of NodeJS using this tutorial](http://raspberryalphaomega.org.uk/2014/06/11/installing-and-using-node-js-on-raspberry-pi/).

* Clone repository:

`git clone https://github.com/ItHasU/filpilote.git`

* Install node dependencies in folder (gpio is only required on real Raspberry Pi, not for development):

`cd filpilote`

`npm install`

`npm install gpio`

* Start as a daemon using forever (optional):

`sudo /opt/node/bin/npm install forever -g`

`forever start filpilote.js`

API
===
* /api/config -> config
* /api/status -> status
* /api/prog/:_id_ # Set program
* /api/manual/:_zone_/:_mode_/:_minutes_ # Program zone in mode for n minutes

Data structures
===============

* config
* config.modes
* config.modes.id
* config.zones
* config.zones.id.name
* config.zones.id.ios
* config.programs.id.name
* config.programs.id.defauts
* config.programs.id.rules[]
* config.programs.id.rules[].days[]
* config.programs.id.rules[].zone
* config.programs.id.rules[].from
* config.programs.id.rules[].to
* config.programs.id.rules[].mode

* status
* status.program
* status.zones
* status.device_gpios
* status.device\_gpios\_debug
* status.manuals[]
* status.manuals[].zone
* status.manuals[].from\_date
* status.manuals[].to\_date
* status.manuals[].mode