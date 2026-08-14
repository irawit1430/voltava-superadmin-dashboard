import re

with open('src/pages/Devices.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { useEffect, useState, FormEvent } from 'react';", "import { useEffect, useState, FormEvent, useMemo } from 'react';")

content = content.replace("const [search, setSearch] = useState('');", """const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');""")

content = content.replace("search=${encodeURIComponent(search)}", "search=${encodeURIComponent(searchQuery)}")
content = content.replace("[search, page]", "[searchQuery, page]")

# add useMemo hooks
hooks_code = """
  const deviceStats = useMemo(() => {
    const totalCount = devices.length;
    const activeCount = devices.filter(d => d.status === 'ONLINE').length;
    const totalErrorAlerts = devices.filter(d => d.status === 'ERROR' || d.status === 'OFFLINE').length;
    const percentageActive = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    return {
      totalCount,
      activeCount,
      totalErrorAlerts,
      percentageActive
    };
  }, [devices]);

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        (device.deviceId && device.deviceId.toLowerCase().includes(searchLower)) ||
        (device.serialNumber && device.serialNumber.toLowerCase().includes(searchLower)) ||
        (device.licensePlate && device.licensePlate.toLowerCase().includes(searchLower));

      const matchesStatus = selectedStatus === 'All Statuses' ||
        device.status === selectedStatus.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [devices, selectedStatus, searchQuery]);
"""

# inject before useEffect
content = content.replace("  useEffect(() => {", hooks_code + "\n  useEffect(() => {")

with open('src/pages/Devices.tsx', 'w') as f:
    f.write(content)
