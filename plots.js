(function (global) {
    const category = (value = "") => value.toLowerCase();

    const getLocationCounts = (sortedData = []) =>
        sortedData.reduce((acc, item) => {
            const key = item.specificLocation || "Unknown";
            acc.set(key, (acc.get(key) || 0) + 1);
            return acc;
        }, new Map());

    const getMealChartData = (sortedData = []) => {
        const foodEntries = sortedData.filter(item => category(item.category) === "food");
        const totalMeals = foodEntries.length || 1;

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
            const percent = Math.round((count / totalMeals) * 1000) / 10;
            return { label: bucket.label, count, percent };
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
        const totalVisits = sortedData.length || 1;
        const frequentLocations = Array.from(locationCounts.entries()).filter(([, count]) => count > 1);
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

        const mealChartData = getMealChartData(sortedData);

        Plotly.newPlot("plot4", [{
            x: mealChartData.map(m => m.percent),
            y: mealChartData.map(m => m.label),
            type: "bar",
            orientation: "h",
            text: mealChartData.map(m => `${m.count} (${m.percent}%)`),
            textposition: "auto",
            marker: { color: ["#ffa600", "#ff6361", "#bc5090", "#58508d", "#003f5c"] }
        }], {
            title: "Meal Time (percent of food entries)",
            xaxis: { title: "Percent of food entries" },
            yaxis: { automargin: true },
            margin: { l: 140 }
        });

        renderSummary("viz-summary", sortedData);
        renderOutliers("location-outliers", singleVisitLocations);
    };

    global.DataVizModule = {
        renderPlots
    };
})(window);
