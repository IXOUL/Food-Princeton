(function (global) {
    const timeSlots = ["Morning", "Noon", "Afternoon", "Evening", "Night"];

    const moodColors = {
        cold: "#cccccc",   // 0–5
        cozy: "#ffe4a3",   // 6–7
        warm: "#ffb15c",   // 8–9
        happy: "#ff7f50"   // 10
    };

    const parseDateValue = (dateStr) => {
        const [year, month, day] = (dateStr || "").split("-").map(Number);
        return new Date(year, (month || 1) - 1, day || 1);
    };

    const formatLocationLabel = (entry = {}) => {
        const base = (entry.specificLocation || "Unknown").trim();
        const nycDetail = (entry.nycLocation || "").trim();
        if (base.toLowerCase() === "nyc" && nycDetail) {
            return `NYC · ${nycDetail}`;
        }
        return base || "Unknown";
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

    const formatDayLabel = (dateObj) =>
        dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    const buildDayColumns = (sortedData) => {
        const dayMap = new Map();

        sortedData.forEach(item => {
            const isoDate = formatISODate(parseDateValue(item.date));
            if (!dayMap.has(isoDate)) {
                const dateObj = parseDateValue(isoDate);
                dayMap.set(isoDate, {
                    isoDate,
                    dateObj,
                    label: formatDayLabel(dateObj),
                    entries: {}
                });
            }
            dayMap.get(isoDate).entries[item.timeOfDay] = item;
        });

        return Array.from(dayMap.values()).sort((a, b) => a.dateObj - b.dateObj);
    };

    const createCell = (item, onCellClick) => {
        const cell = document.createElement("div");
        cell.className = "photo-cell";

        if (!item) {
            cell.classList.add("empty");
            return cell;
        }

        const moodKey = item.colorMood || item.emotion;
        const moodColor = moodColors[moodKey] || "#e0e0e0";
        const locationLabel = formatLocationLabel(item);
        const foodLine = item.foodItems ? `<div class="food-line">What I ate: ${item.foodItems}</div>` : "";
        cell.style.borderColor = moodColor;
        cell.innerHTML = `
            <img src="${item.img}" alt="">
            <div class="photo-info">
                <div>${item.exactTime} · ${locationLabel}</div>
                ${foodLine}
            </div>
        `;
        cell.title = `${item.date} ${item.exactTime} — ${locationLabel}${item.foodItems ? " — " + item.foodItems : ""}`;
        cell.onclick = () => onCellClick(item);

        return cell;
    };

    const buildHorizontalGrid = (days, onCellClick) => {
        const grid = document.createElement("div");
        grid.className = "timeline-grid timeline-grid-horizontal";
        const columnTemplate = ["100px", ...days.map(() => "160px")].join(" ");
        grid.style.gridTemplateColumns = columnTemplate;

        const corner = document.createElement("div");
        corner.className = "calendar-corner sticky-col";
        corner.textContent = "Time of day";
        grid.appendChild(corner);

        days.forEach(day => {
            const header = document.createElement("div");
            header.className = "calendar-header date-header";
            header.innerHTML = `<strong>${day.label}</strong><span>${day.isoDate}</span>`;
            grid.appendChild(header);
        });

        timeSlots.forEach(slot => {
            const label = document.createElement("div");
            label.className = "time-label sticky-col";
            label.textContent = slot;
            grid.appendChild(label);

            days.forEach(day => {
                const cell = createCell(day.entries[slot], onCellClick);
                grid.appendChild(cell);
            });
        });

        return grid;
    };

    const buildVerticalGrid = (days, onCellClick) => {
        const grid = document.createElement("div");
        grid.className = "timeline-grid timeline-grid-vertical";
        const columnTemplate = ["120px", ...timeSlots.map(() => "1fr")].join(" ");
        grid.style.gridTemplateColumns = columnTemplate;

        const corner = document.createElement("div");
        corner.className = "calendar-corner sticky-col";
        corner.textContent = "Date";
        grid.appendChild(corner);

        timeSlots.forEach(slot => {
            const header = document.createElement("div");
            header.className = "calendar-header sticky-top";
            header.textContent = slot;
            grid.appendChild(header);
        });

        days.forEach(day => {
            const dayLabel = document.createElement("div");
            dayLabel.className = "day-label sticky-col";
            dayLabel.innerHTML = `<strong>${day.label}</strong><span>${day.isoDate}</span>`;
            grid.appendChild(dayLabel);

            timeSlots.forEach(slot => {
                const cell = createCell(day.entries[slot], onCellClick);
                grid.appendChild(cell);
            });
        });

        return grid;
    };

    const buildControls = () => {
        const controls = document.createElement("div");
        controls.className = "calendar-controls";

        const copy = document.createElement("div");
        copy.className = "controls-copy";
        // copy.innerHTML = `<strong>Scroll Horizontally to see what I have for each day!</strong>`;
        controls.appendChild(copy);

        return controls;
    };

    const renderCalendar = (sortedData = [], options = {}) => {
        const {
            containerId = "calendar",
            onCellClick = () => { },
            initialLayout = "horizontal"
        } = options;

        const calendarContainer = document.getElementById(containerId);
        if (!calendarContainer) {
            return;
        }

        const days = buildDayColumns(sortedData);
        const layout = "horizontal";

        calendarContainer.innerHTML = "";

        const shell = document.createElement("div");
        shell.className = "timeline-panel";

        const scrollArea = document.createElement("div");
        scrollArea.className = "timeline-scroll";

        const controls = buildControls();

        shell.appendChild(controls);
        shell.appendChild(scrollArea);
        calendarContainer.appendChild(shell);

        const renderGrid = () => {
            scrollArea.innerHTML = "";
            scrollArea.classList.remove("vertical-mode");
            const grid = buildHorizontalGrid(days, onCellClick);
            scrollArea.appendChild(grid);
        };

        renderGrid();
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
