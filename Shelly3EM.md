# Shelly 3EM
Shelly 3EM Gen3 is a 3 (three) phase Energy Metering device for a Y (star) 4 - four wire connection. The device measures consumed energy from the system and stores it on five minute intervals, with enhanced data for the Active Power, Apparent Power, Voltage, Current on the 3 phases.

3EM device supports two distinct profiles: default - triphase and monophase.

In the triphase profile there is a single energy meter EM which combines the readings per phase and provides totals for all phases, measuring three distinct phases and representing them. EMData is a single database for the entire device in this profile.

In the monophase profile there are three energy meters EM1, one per measured channel. For each channel, there is a database instance EM1Data.

### The following components are available in Shelly 3EM Gen3:

System
WiFi
Bluetooth Low Energy
Cloud
MQTT
Modbus
Outbound Websocket
1 instance of EM (em:0) **
3 instances of EM1 (em1:0, em1:1, em1:2) * **
1 instance of EMData (emdata:0)
3 instances of EM1Data (em1data:0, em1data:1, em1data:2) *
Virtual components
BTHome components
Up to 10 instances of Script

* Available only in monophase profile.

** The CTs of the device cannot be changed, thus the methods to self-calibrate the CTs are not available.

## Parameters
These parameters are used by the device to measure and report data to the user.

voltage_limit_v - the voltage limit that the device can handle safely - set to 280V. Above 280V an error is triggered, the device will be damaged if higher voltages are applied.
current_limit_a - the maximum current which the device can measure - set to 63A. The device is unable to measure above this limit, an error is triggered, the device will be damaged if higher currents are applied.
power_threshold - the reporting threshold to notify for a change in Power value. Consists of two settings:
ratio - ratio between new value and last received value - set to 0.05 or 5%
absolute - absolute difference between new value and last received value - set to 10.0W
voltage_threshold- the reporting threshold to notify for a change in Voltage value. Consists of two settings:
ratio - ratio between new value and last received value - set to 0.05 or 5%
absolute - absolute difference between new value and last received value - set to 1.0V
current_threshold- the reporting threshold to notify for a change in Current value. Consists of two settings:
ratio - ratio between new value and last received value - set to 0.05 or 5%
absolute - absolute difference between new value and last received value - set to 0.05A
power_factor_threshold- the reporting threshold to notify for a change in Power Factor value. Consists of two settings:
ratio - ratio between new value and last received value - set to 0.05 or 5%
absolute - absolute difference between new value and last received value - set to 0.01
power_factor is a dimensionless value.
energies are reported upon receiving a new value, they are not threshold dependent.
Upon receiving a new value, it is checked against both the ratio and absolute differences, if one of them is satisfied - a new value is reported. After the check the new value becomes last received value.
