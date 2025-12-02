(function (global) {
    const category = (value = "") => value.toLowerCase();

    const groupDailySatisfaction = (sortedData = []) => {
        const dailyMap = new Map();
        sortedData.forEach(item => {
            const val = parseFloat(item.satisfaction);
            if (Number.isNaN(val)) return;
            const day = item.date;
            if (!dailyMap.has(day)) dailyMap.set(day, []);
            dailyMap.get(day).push(val);
        });
        return Array.from(dailyMap.entries())
            .map(([day, values]) => ({
                date: day,
                avg: values.reduce((a, b) => a + b, 0) / values.length
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const smoothSeries = (points = [], window = 3) => {
        if (!points.length) return [];
        const half = Math.floor(window / 2);
        return points.map((_, idx) => {
            const start = Math.max(0, idx - half);
            const end = Math.min(points.length - 1, idx + half);
            const slice = points.slice(start, end + 1);
            const avg = slice.reduce((sum, p) => sum + p.avg, 0) / slice.length;
            return { date: points[idx].date, avg };
        });
    };

    const getLocationCounts = (sortedData = []) =>
        sortedData.reduce((acc, item) => {
            const key = item.specificLocation || "Unknown";
            acc.set(key, (acc.get(key) || 0) + 1);
            return acc;
        }, new Map());

    const getMealChartData = (sortedData = [], totalDays = 1) => {
        const foodEntries = sortedData.filter(item => category(item.category) === "food");
        const days = totalDays || 1;

        const mealBuckets = [
            { label: "Breakfast", slots: ["Morning"] },
            { label: "Lunch", slots: ["Noon"] },
            { label: "Afternoon", slots: ["Afternoon"] },
            { label: "Dinner", slots: ["Evening"] },
            { label: "Night", slots: ["Night"] }
        ];

        return mealBuckets.map(bucket => {
            const count = foodEntries.reduce(
                (acc, entry) => acc + (bucket.slots.includes(entry.timeOfDay) ? 1 : 0),
                0
            );
            const percentDays = Math.round((count / days) * 1000) / 10;
            return { label: bucket.label, count, percentDays };
        });
    };

    const getMealComboData = (sortedData = [], totalDays = 1) => {
        const foodEntries = sortedData.filter(item => category(item.category) === "food");
        const days = totalDays || 1;
        const mealBuckets = [
            { label: "Breakfast", slots: ["Morning"] },
            { label: "Lunch", slots: ["Noon", "Afternoon"] },
            { label: "Dinner", slots: ["Evening", "Night"] }
        ];

        return mealBuckets.map(bucket => {
            const count = foodEntries.reduce(
                (acc, entry) => acc + (bucket.slots.includes(entry.timeOfDay) ? 1 : 0),
                0
            );
            const percentDays = Math.round((count / days) * 1000) / 10;
            return { label: bucket.label, count, percentDays };
        });
    };

    const renderSummary = (targetId, sortedData = []) => {
        const totalDays = new Set(sortedData.map(item => item.date)).size;
        const totalEntries = sortedData.length;
        const el = document.getElementById(targetId);
        if (!el) return;
        el.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Total days recorded</div>
                <div class="stat-value">${totalDays}</div>
                <div class="stat-sub">${totalEntries} entries logged</div>
            </div>
        `;
    };

    const renderOutliers = (targetId, items = []) => {
        const el = document.getElementById(targetId);
        if (!el) return;
        if (!items.length) {
            el.textContent = "No single-visit locations—nice and consistent!";
            return;
        }
        el.innerHTML = `
            <div class="pill-list">
                ${items.map(name => `<span class="pill">${name}</span>`).join("")}
            </div>
        `;
    };

    const renderPlots = (sortedData = []) => {
        if (!global.Plotly || !sortedData.length) {
            return;
        }

        const locationCounts = getLocationCounts(sortedData);
        const totalDays = new Set(sortedData.map(item => item.date)).size || 1;
        const dailySatisfaction = groupDailySatisfaction(sortedData);
        const smoothedSatisfaction = smoothSeries(dailySatisfaction, 3);
        const totalVisits = sortedData.length || 1;
        const frequentLocations = Array.from(locationCounts.entries())
            .filter(([, count]) => count > 1)
            .sort((a, b) => b[1] - a[1]);
        const singleVisitLocations = Array.from(locationCounts.entries())
            .filter(([, count]) => count === 1)
            .map(([name]) => name);
        const locationLabels = frequentLocations.map(([name]) => name);
        const singleVisitTotal = singleVisitLocations.length;
        const locationPercents = frequentLocations.map(([, count]) =>
            Math.round((count / totalVisits) * 1000) / 10
        );
        const locationCountsText = frequentLocations.map(([, count], idx) =>
            `${count} (${locationPercents[idx]}%)`
        );
        if (singleVisitTotal > 0) {
            const otherPercent = Math.round((singleVisitTotal / totalVisits) * 1000) / 10;
            locationLabels.push("Other");
            locationPercents.push(otherPercent);
            locationCountsText.push(`${singleVisitTotal} (${otherPercent}%)`);
        }

        Plotly.newPlot("plot1", [
            {
                x: dailySatisfaction.map(d => d.date),
                y: dailySatisfaction.map(d => d.avg),
                type: "scatter",
                mode: "markers",
                name: "Daily avg",
                marker: { size: 8, color: "#888" }
            },
            {
                x: smoothedSatisfaction.map(d => d.date),
                y: smoothedSatisfaction.map(d => d.avg),
                type: "scatter",
                mode: "lines",
                name: "Smoothed (3-day)",
                line: { color: "#f7c741", width: 3, shape: "spline", smoothing: 0.6 }
            }
        ], {
            title: "Satisfaction Over Time",
            yaxis: { title: "Average satisfaction" },
            xaxis: { title: "Date" },
            legend: { orientation: "h", x: 0, y: 1.1 }
        });

        const locationTarget = document.getElementById("plot2");
        const steppedPalette = [
            "#c47a00", // rich amber (most frequent)
            "#d28a08",
            "#e19a12",
            "#f7c741", // signature gold
            "#efbc4a",
            "#f4cc6a",
            "#f7d98f",
            "#f7e5b3",
            "#eae0c6",
            "#eee9dc",
            "#f4f3ef",
            "#faf9f7"  // lightest (least frequent)
        ];

        const locationColors = locationLabels.map((label, idx) => {
            if (label === "Other") return "#cfc8bb";
            const paletteIndex = Math.min(idx, steppedPalette.length - 1);
            return steppedPalette[paletteIndex];
        });

        if (!locationLabels.length && locationTarget) {
            locationTarget.innerHTML = "<p class=\"chart-note\">No repeat locations yet — start logging more visits to see this chart.</p>";
        } else {
            Plotly.newPlot("plot2", [{
                labels: locationLabels,
                values: locationPercents,
                type: "pie",
                text: locationCountsText,
                textinfo: "label+percent",
                hovertemplate: "%{label}<br>%{value}% (%{text})<extra></extra>",
                marker: { colors: locationColors }
            }], {
                title: "Frequency by Location (percent of visits)",
                showlegend: false
            });
        }

        const mealChartData = getMealChartData(sortedData, totalDays);
        const mealOrderLabels = [
            "Breakfast",
            "Lunch",
            "Afternoon",
            "Dinner",
            "Night"
        ];
        const mealComboData = getMealComboData(sortedData, totalDays);

        Plotly.newPlot("plot4", [{
            x: mealChartData.map(m => m.percentDays),
            y: mealChartData.map(m => m.label),
            type: "bar",
            orientation: "h",
            text: mealChartData.map(m => `${m.count} (${m.percentDays}%)`),
            textposition: "auto",
            marker: { color: ["#ffa600", "#ff6361", "#bc5090", "#58508d", "#003f5c"] }
        }], {
            title: "Meal Time (percent of days)",
            xaxis: { title: "Percent of days with this meal" },
            yaxis: {
                automargin: true,
                categoryorder: "array",
                categoryarray: mealOrderLabels
            },
            margin: { l: 90, r: 12 }
        });

        Plotly.newPlot("plot5", [{
            x: mealComboData.map(m => m.percentDays),
            y: mealComboData.map(m => m.label),
            type: "bar",
            orientation: "h",
            text: mealComboData.map(m => `${m.count} (${m.percentDays}%)`),
            textposition: "auto",
            marker: { color: ["#ffa600", "#ff6361", "#003f5c"] }
        }], {
            title: "Core Meals (percent of days)",
            xaxis: { title: "Percent of days with this meal (combined)" },
            yaxis: { automargin: true },
            margin: { l: 80, r: 30 }
        });

        renderSummary("viz-summary", sortedData);
        renderOutliers("location-outliers", singleVisitLocations);
    };

    global.DataVizModule = {
        renderPlots
    };
})(window);
