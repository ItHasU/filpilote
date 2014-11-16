filpilote
=========

Web interface for remote control of heaters.

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
* config.programs.id.rules[].zones[]
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