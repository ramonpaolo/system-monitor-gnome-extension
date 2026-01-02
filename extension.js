/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import St from 'gi://St';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const SystemInfoButton = GObject.registerClass(
    class SystemInfoButton extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('System Information'), false);

            this._layout = new St.BoxLayout({ style_class: 'system-info-layout' });
            this.add_child(this._layout);

            this._createWidgets();

            this._updateInterval = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                this._updateInfo();
                return GLib.SOURCE_CONTINUE;
            });

            this._updateInfo();
        }

        _createWidgets() {
            this._cpuLabel = new St.Label({
                text: 'CPU 0%',
                style_class: 'system-info-label cpu-group'
            });

            this._cpuTempLabel = new St.Label({
                text: 'CPU Temp 0°C',
                style_class: 'system-info-label cpu-group'
            });

            this._gpuUsageLabel = new St.Label({
                text: 'GPU 0%',
                style_class: 'system-info-label gpu-group'
            });

            this._gpuTempLabel = new St.Label({
                text: 'GPU Temp 0°C',
                style_class: 'system-info-label gpu-group'
            });

            this._memoryLabel = new St.Label({
                text: 'Memory 0%',
                style_class: 'system-info-label memory-group'
            });

            this._layout.add_child(this._cpuLabel);
            this._layout.add_child(new St.Label({ text: ' | ' }));

            this._layout.add_child(this._cpuTempLabel);
            this._layout.add_child(new St.Label({ text: ' | ' }));

            this._layout.add_child(this._gpuUsageLabel);
            this._layout.add_child(new St.Label({ text: ' | ' }));

            this._layout.add_child(this._gpuTempLabel);
            this._layout.add_child(new St.Label({ text: ' | ' }));

            this._layout.add_child(this._memoryLabel);
        }

        _updateInfo() {
            try {
                const cpuUsage = this._getCPUUsage();
                const cpuTemp = this._getCPUTemperature();
                const gpuUsage = this._getGPUUsage();
                const gpuTemp = this._getGPUTemperature();
                const memoryUsage = this._getMemoryUsage();

                this._cpuLabel.text = `CPU ${cpuUsage}%`;
                this._cpuTempLabel.text = `CPU Temp ${cpuTemp}°C`;
                this._gpuUsageLabel.text = `GPU ${gpuUsage}%`;
                this._gpuTempLabel.text = `GPU Temp ${gpuTemp}°C`;
                this._memoryLabel.text = `Memory ${memoryUsage}%`;

            } catch (error) {
                console.error('Erro ao atualizar informações do sistema:', error);
            }
        }

        _getCPUUsage() {
            try {
                const cpuFile = '/proc/stat';
                const cpuData = GLib.file_get_contents(cpuFile)[1].toString();
                const lines = cpuData.split('\n');

                if (lines.length > 0) {
                    const cpuLine = lines[0];
                    const cpuParts = cpuLine.split(/\s+/);

                    if (cpuParts.length >= 10) {
                        const user = parseInt(cpuParts[1]);
                        const nice = parseInt(cpuParts[2]);
                        const system = parseInt(cpuParts[3]);
                        const idle = parseInt(cpuParts[4]);
                        const iowait = parseInt(cpuParts[5]);
                        const irq = parseInt(cpuParts[6]);
                        const softirq = parseInt(cpuParts[7]);
                        const steal = parseInt(cpuParts[8]);

                        const total = user + nice + system + idle + iowait + irq + softirq + steal;

                        const idleTime = idle + iowait;

                        if (this._lastCpuTotal === undefined) {
                            this._lastCpuTotal = total;
                            this._lastCpuIdle = idleTime;
                            return 0;
                        }

                        const totalDiff = total - this._lastCpuTotal;
                        const idleDiff = idleTime - this._lastCpuIdle;

                        if (totalDiff > 0) {
                            const usage = Math.floor(((totalDiff - idleDiff) / totalDiff) * 100);
                            this._lastCpuTotal = total;
                            this._lastCpuIdle = idleTime;
                            return Math.min(100, Math.max(0, usage));
                        }

                        this._lastCpuTotal = total;
                        this._lastCpuIdle = idleTime;
                    }
                }
            } catch (error) {
                console.error('Erro ao obter CPU usage:', error);
            }

            return 0;
        }

        _getCPUTemperature() {
            try {
                const thermalFile = '/sys/class/thermal/thermal_zone0/temp';
                if (GLib.file_test(thermalFile, GLib.FileTest.EXISTS)) {
                    const tempData = GLib.file_get_contents(thermalFile)[1].toString();
                    return Math.floor(parseInt(tempData.trim()) / 1000);
                }

                const [success, stdout] = GLib.spawn_command_line_sync('sensors -j');

                if (success && stdout.length > 0) {
                    const output = stdout.toString();
                    const cpuTempMatch = output.match(/"([a-zA-Z0-9]+)_temp\d*":\s*\{[^}]*"temp\d*_input":\s*(\d+)/);
                    if (cpuTempMatch) {
                        return Math.floor(parseInt(cpuTempMatch[2]) / 1000);
                    }
                }

                const [success2, stdout2] = GLib.spawn_command_line_sync('sensors');

                if (success2 && stdout2.length > 0) {
                    const output = stdout2.toString();
                    const tempMatch = output.match(/(?:CPU|cpu).*?(\d+(?:\.\d+)?)°C/);
                    if (tempMatch) {
                        return Math.floor(parseFloat(tempMatch[1]));
                    }
                }

            } catch (error) {
                console.error('Erro ao obter temperatura da CPU:', error);
            }

            return 0;
        }

        _getGPUUsage() {
            try {
                const [success, stdout, stderr] = GLib.spawn_command_line_sync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits');

                if (success && stdout.length > 0) {
                    const usage = stdout.toString().trim();
                    return parseInt(usage) || 0;
                }

                const [success2, stdout2] = GLib.spawn_command_line_sync('glxinfo | grep -i "gpu.*utilization"');

                if (success2 && stdout2.length > 0) {
                    const output = stdout2.toString();
                    const usageMatch = output.match(/(\d+)%/);
                    if (usageMatch) {
                        return parseInt(usageMatch[1]);
                    }
                }

            } catch (error) {
                console.error('Erro ao obter uso da GPU:', error);
            }

            return 0;
        }

        _getGPUTemperature() {
            try {
                const [success, stdout, stderr] = GLib.spawn_command_line_sync('nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits');

                if (success && stdout.length > 0) {
                    const temp = stdout.toString().trim();
                    return parseInt(temp) || 0;
                }

                const [success2, stdout2] = GLib.spawn_command_line_sync('sensors -j');

                if (success2 && stdout2.length > 0) {
                    const output = stdout2.toString();
                    const gpuTempMatch = output.match(/"([a-zA-Z0-9]+)_temp\d*":\s*\{[^}]*"temp\d*_input":\s*(\d+)/);
                    if (gpuTempMatch) {
                        return Math.floor(parseInt(gpuTempMatch[2]) / 1000);
                    }
                }

                const [success3, stdout3] = GLib.spawn_command_line_sync('sensors');

                if (success3 && stdout3.length > 0) {
                    const output = stdout3.toString();
                    const tempMatch = output.match(/(?:GPU|gpu).*?(\d+(?:\.\d+)?)°C/);
                    if (tempMatch) {
                        return Math.floor(parseFloat(tempMatch[1]));
                    }
                }

            } catch (error) {
                console.error('Erro ao obter temperatura da GPU:', error);
            }

            return 0;
        }

        _getMemoryUsage() {
            try {
                const memFile = '/proc/meminfo';
                const memData = GLib.file_get_contents(memFile)[1].toString();
                const lines = memData.split('\n');

                let totalMem = 0;
                let freeMem = 0;
                let availableMem = 0;

                for (const line of lines) {
                    if (line.startsWith('MemTotal:')) {
                        totalMem = parseInt(line.split(':')[1].trim().split(' ')[0]);
                    } else if (line.startsWith('MemFree:')) {
                        freeMem = parseInt(line.split(':')[1].trim().split(' ')[0]);
                    } else if (line.startsWith('MemAvailable:')) {
                        availableMem = parseInt(line.split(':')[1].trim().split(' ')[0]);
                    }
                }

                if (totalMem > 0) {
                    const usedMem = totalMem - availableMem;
                    return Math.floor((usedMem / totalMem) * 100);
                }
            } catch (error) {
                console.error('Erro ao obter uso de memória:', error);
            }

            return 0;
        }

        destroy() {
            if (this._updateInterval) {
                GLib.source_remove(this._updateInterval);
            }
            super.destroy();
        }
    });

export default class SystemInfoExtension extends Extension {
    enable() {
        this._systemInfoButton = new SystemInfoButton();
        Main.panel.addToStatusArea('system-info', this._systemInfoButton, 0, 'right');
    }

    disable() {
        if (this._systemInfoButton) {
            this._systemInfoButton.destroy();
            this._systemInfoButton = null;
        }
    }
}
