# Shelly Data Collection with Systemd

## Setup Summary

We created a systemd-based solution to run Shelly data collection scripts daily at 2:30 AM:

1. Created a shell script that runs all Shelly data collection scripts in sequence
2. Set up a systemd service to execute the script
3. Created a systemd timer to trigger the service daily

## Files Created

- `/home/kspr/ShellyCLI-mod/collect_all_shelly_data.sh` - Main script that runs all data collection scripts
- `/etc/systemd/system/shelly-collector.service` - Service definition
- `/etc/systemd/system/shelly-collector.timer` - Timer that triggers the service daily at 2:30 AM

## Checking Status

Check timer status:
```bash
systemctl status shelly-collector.timer
```

Check when the timer will next run:
```bash
systemctl list-timers | grep shelly
```

Check service status:
```bash
systemctl status shelly-collector.service
```

View recent logs:
```bash
journalctl -u shelly-collector.service -n 50
```

Check custom log file:
```bash
tail -n 50 /home/kspr/ShellyCLI-mod/shelly_daily_fetch.log
```

## Maintenance

### Running Manually

To run the collection immediately:
```bash
sudo systemctl start shelly-collector.service
```

### Changing Schedule

Edit the timer file:
```bash
sudo nano /etc/systemd/system/shelly-collector.timer
```

Modify the `OnCalendar` line (examples):
- `*-*-* 04:00:00` - Run at 4:00 AM daily
- `Mon *-*-* 02:30:00` - Run at 2:30 AM on Mondays
- `*-*-* 02:30:00,14:30:00` - Run at 2:30 AM and 2:30 PM daily

After editing, reload and restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart shelly-collector.timer
```

### Troubleshooting

If scripts aren't running:

1. Check timer is enabled and active:
   ```bash
   systemctl is-enabled shelly-collector.timer
   systemctl is-active shelly-collector.timer
   ```

2. Check service execution logs:
   ```bash
   journalctl -u shelly-collector.service
   ```

3. Verify script permissions:
   ```bash
   ls -la /home/kspr/ShellyCLI-mod/collect_all_shelly_data.sh
   ```

4. Test script manually:
   ```bash
   sudo -u kspr /home/kspr/ShellyCLI-mod/collect_all_shelly_data.sh
   ```

### Disabling Temporarily

```bash
sudo systemctl stop shelly-collector.timer
```

To re-enable:
```bash
sudo systemctl start shelly-collector.timer
```

### Removing Completely

```bash
sudo systemctl stop shelly-collector.timer
sudo systemctl disable shelly-collector.timer
sudo systemctl stop shelly-collector.service
sudo systemctl disable shelly-collector.service
sudo rm /etc/systemd/system/shelly-collector.timer
sudo rm /etc/systemd/system/shelly-collector.service
```
