(function (global) {
    const timeSlots = ["Morning", "Noon", "Afternoon", "Evening", "Night"];

    const moodColors = {
    cold: "#cccccc",   // 0–5
    cozy: "#ffe4a3",   // 6–7
    warm: "#ffb15c",   // 8–9
    happy: "#ff7f50"   // 10
};


    const referenceWeekStart = new Date(2025, 10, 10);
    referenceWeekStart.setHours(0, 0, 0, 0);
    const msInDay = 24 * 60 * 60 * 1000;
    const msInWeek = msInDay * 7;

    const parseDateValue = (dateStr) => {
        const [year, month, day] = (dateStr || "").split("-").map(Number);
        return new Date(year, (month || 1) - 1, day || 1);
    };

    const formatISODate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const parseDateTime = (entry) => {
        const date = parseDateValue(entry.date);
        const [hours = 0, minutes = 0] = (entry.exactTime || "00:00")
            .split(":")
            .map(Number);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
    };

    const getWeekStart = (dateObj) => {
        const start = new Date(dateObj);
        const day = start.getDay();
        const diff = (day + 6) % 7; // convert Sunday=0 to Monday start
        start.setDate(start.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        return start;
    };

    const formatWeekLabel = (dateObj) =>
        dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const formatWeekRange = (startDate) => {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        return `${formatWeekLabel(startDate)} – ${formatWeekLabel(endDate)}`;
    };

    const buildWeekGroups = (sortedData) => {
        const weekGroups = new Map();

        sortedData.forEach(item => {
            const dateObj = parseDateValue(item.date);
            const weekStart = getWeekStart(dateObj);
            const weekNumber = 10 + Math.round((weekStart - referenceWeekStart) / msInWeek);
            if (weekNumber < 1) {
                return;
            }
            const key = weekStart.getTime();
            if (!weekGroups.has(key)) {
                weekGroups.set(key, {
                    weekStart,
                    weekNumber,
                    entryMap: new Map()
                });
            }
            const group = weekGroups.get(key);
            group.entryMap.set(`${item.date}_${item.timeOfDay}`, item);
        });

        return Array.from(weekGroups.values()).sort((a, b) => a.weekStart - b.weekStart);
    };

    const renderCalendar = (sortedData = [], options = {}) => {
        const { containerId = "calendar", onCellClick = () => { } } = options;
        const calendarContainer = document.getElementById(containerId);
        if (!calendarContainer) {
            return;
        }

        const weeks = buildWeekGroups(sortedData);
        calendarContainer.innerHTML = "";

        weeks.forEach(group => {
            const weekSection = document.createElement("div");
            weekSection.className = "calendar-week";

            const title = document.createElement("div");
            title.className = "week-title";
            title.textContent = `Week ${group.weekNumber} (${formatWeekRange(group.weekStart)})`;
            weekSection.appendChild(title);

            const grid = document.createElement("div");
            grid.className = "calendar-grid";
            grid.style.gridTemplateColumns = `120px repeat(7, 1fr)`;

            const corner = document.createElement("div");
            corner.className = "calendar-corner";
            grid.appendChild(corner);

            const weekDates = Array.from({ length: 7 }, (_, idx) => {
                const date = new Date(group.weekStart);
                date.setDate(group.weekStart.getDate() + idx);
                return date;
            });

            weekDates.forEach(date => {
                const header = document.createElement("div");
                header.className = "calendar-header";
                header.textContent = formatISODate(date);
                grid.appendChild(header);
            });

            timeSlots.forEach(slot => {
                const label = document.createElement("div");
                label.className = "time-label";
                label.textContent = slot;
                grid.appendChild(label);

                weekDates.forEach(dateObj => {
                    const isoDate = formatISODate(dateObj);
                    const cell = document.createElement("div");
                    cell.className = "photo-cell";

                    const item = group.entryMap.get(`${isoDate}_${slot}`);

                    if (item) {
                        const moodKey = item.colorMood || item.emotion;
                        const moodColor = moodColors[moodKey] || "#e0e0e0";
                        cell.style.borderColor = moodColor;
                        cell.innerHTML = `
                            <img src="${item.img}" alt="">
                            <div class="photo-info">${item.exactTime} · ${item.specificLocation}</div>
                        `;
                        cell.onclick = () => onCellClick(item);
                    } else {
                        cell.classList.add("empty");
                    }

                    grid.appendChild(cell);
                });
            });

            weekSection.appendChild(grid);
            calendarContainer.appendChild(weekSection);
        });
    };

    const prepareEntries = (data = []) => {
        const normalizedData = data.map(item => ({
            ...item,
            date: formatISODate(parseDateValue(item.date))
        }));

        const sortedData = [...normalizedData].sort((a, b) => parseDateTime(a) - parseDateTime(b));
        return { normalizedData, sortedData };
    };

    global.CalendarModule = {
        renderCalendar,
        prepareEntries
    };
})(window);
