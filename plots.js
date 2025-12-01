(function (global) {
    const category = (value = "") => value.toLowerCase();

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
            { label: "Dinner", slots: ["Evening"] },
            { label: "Afternoon Late Meal", slots: ["Afternoon"] },
            { label: "Night Late Meal", slots: ["Night"] }
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
            { label: "Lunch<br>(Lunch + Afternoon)", slots: ["Noon", "Afternoon"] },
            { label: "Dinner<br>(Dinner + Night)", slots: ["Evening", "Night"] }
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
            <div class="outlier-title">Single-visit locations</div>
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
        const totalVisits = sortedData.length || 1;
        const frequentLocations = Array.from(locationCounts.entries())
            .filter(([, count]) => count > 1)
            .sort((a, b) => b[1] - a[1]);
        const singleVisitLocations = Array.from(locationCounts.entries())
            .filter(([, count]) => count === 1)
            .map(([name]) => name);
        const locationLabels = frequentLocations.map(([name]) => name);
        const locationPercents = frequentLocations.map(([, count]) =>
            Math.round((count / totalVisits) * 1000) / 10
        );
        const locationCountsText = frequentLocations.map(([, count], idx) =>
            `${count} (${locationPercents[idx]}%)`
        );

        Plotly.newPlot("plot1", [{
            x: sortedData.map(d => d.date),
            y: sortedData.map(d => d.satisfaction),
            type: "scatter",
            mode: "lines+markers",
            marker: { size: 8 }
        }], { title: "Satisfaction Over Time" });

        const locationTarget = document.getElementById("plot2");
        if (!locationLabels.length && locationTarget) {
            locationTarget.innerHTML = "<p class=\"chart-note\">No repeat locations yet — start logging more visits to see this chart.</p>";
        } else {
            Plotly.newPlot("plot2", [{
                x: locationLabels,
                y: locationPercents,
                type: "bar",
                text: locationCountsText,
                textposition: "auto",
                marker: { color: "#111111" }
            }], {
                title: "Frequency by Location (percent of visits)",
                yaxis: { title: "Percent of total visits" },
                margin: { b: 120, t: 60 }
            });
        }

        const mealChartData = getMealChartData(sortedData, totalDays);
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
            yaxis: { automargin: true },
            margin: { l: 140 }
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
            margin: { l: 180 }
        });

        renderSummary("viz-summary", sortedData);
        renderOutliers("location-outliers", singleVisitLocations);
    };

    global.DataVizModule = {
        renderPlots
    };
})(window);
