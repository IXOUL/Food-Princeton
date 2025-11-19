(function (global) {
    const category = (value = "") => value.toLowerCase();

    const getLocationCounts = (sortedData = []) => {
        return sortedData.reduce((acc, item) => {
            const key = item.specificLocation || "Unknown";
            acc.set(key, (acc.get(key) || 0) + 1);
            return acc;
        }, new Map());
    };

    const getMealChartData = (sortedData = []) => {
        const foodEntries = sortedData.filter(item => category(item.category) === "food");

        const mealBuckets = [
            { label: "Breakfast", slots: ["Morning"] },
            { label: "Lunch", slots: ["Noon"] },
            { label: "Dinner", slots: ["Evening"] },
            { label: "Afternoon Late Meal", slots: ["Afternoon"] },
            { label: "Night Late Meal", slots: ["Night"] }
        ];

        const mealCounts = mealBuckets.map(bucket => ({
            label: bucket.label,
            count: foodEntries.reduce(
                (acc, entry) => acc + (bucket.slots.includes(entry.timeOfDay) ? 1 : 0),
                0
            )
        }));

        const totalLoggedDays = new Set(sortedData.map(item => item.date)).size;

        return [
            ...mealCounts,
            { label: "Total Days Recorded", count: totalLoggedDays }
        ];
    };

    const renderPlots = (sortedData = []) => {
        if (!global.Plotly || !sortedData.length) {
            return;
        }

        const locationCounts = getLocationCounts(sortedData);
        const locationLabels = Array.from(locationCounts.keys());
        const locationValues = Array.from(locationCounts.values());

        Plotly.newPlot("plot1", [{
            x: sortedData.map(d => d.date),
            y: sortedData.map(d => d.satisfaction),
            type: "scatter",
            mode: "lines+markers",
            marker: { size: 8 }
        }], { title: "Satisfaction Over Time" });

        Plotly.newPlot("plot2", [{
            x: locationLabels,
            y: locationValues,
            type: "bar"
        }], { title: "Frequency by Location" });

        const mealChartData = getMealChartData(sortedData);

        Plotly.newPlot("plot4", [{
            x: mealChartData.map(m => m.count),
            y: mealChartData.map(m => m.label),
            type: "bar",
            orientation: "h",
            marker: { color: ["#ffa600", "#ff6361", "#bc5090", "#58508d", "#003f5c", "#2f4b7c"] }
        }], {
            title: "Meal Time",
            xaxis: { title: "Frequency" },
            yaxis: { automargin: true },
            margin: { l: 140 }
        });
    };

    global.DataVizModule = {
        renderPlots
    };
})(window);
