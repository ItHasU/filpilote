filpilote
=========

Web interface for remote control of heaters.

API
===

/api/config -> config
/api/status -> status
/api/debug -> status.device_gpios_debug

/api/prog/:id # Set program

Data structures
===============

config
config.modes
config.modes.id
config.zones
config.zones.id.name
config.zones.id.ios
config.programs.id.name
config.programs.id.defauts
config.programs.id.rules[]
config.programs.id.rules[].days
config.programs.id.rules[].zones
config.programs.id.rules[].from
config.programs.id.rules[].to
config.programs.id.rules[].mode

status
status.program
status.zones
status.device_gpios
status.device_gpios_debug
