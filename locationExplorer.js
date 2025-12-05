(function (global) {
    const getLocationLabel = (entry = {}) => {
        const base = (entry.specificLocation || "Unknown").trim();
        const nycDetail = (entry.nycLocation || "").trim();
        if (base.toLowerCase() === "nyc" && nycDetail) {
            return `NYC · ${nycDetail}`;
        }
        return base || "Unknown";
    };

    const getLocationGroups = (sortedData = []) =>
        sortedData.reduce((map, item) => {
            const key = getLocationLabel(item);
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(item);
            return map;
        }, new Map());

    const buildEntryCard = (entry) => {
        const card = document.createElement("div");
        card.className = "location-entry";
        const foodLine = entry.foodItems ? `<span class="food-line">What I ate: ${entry.foodItems}</span>` : "";
        card.innerHTML = `
            <img src="${entry.img}" alt="${getLocationLabel(entry)}">
            <div class="location-entry-details">
                <strong>${entry.date} · ${entry.timeOfDay}</strong>
                ${foodLine}
                <span>${entry.description || entry.note || "No diary note available."}</span>
                <span>Emotion: ${entry.emotion || "n/a"} · Satisfaction: ${entry.satisfaction ?? "—"}</span>
            </div>
        `;
        return card;
    };

    const renderLocations = (sortedData = []) => {
        const listEl = document.getElementById("location-list");
        const feedEl = document.getElementById("location-feed");
        if (!listEl || !feedEl || !sortedData.length) {
            return;
        }

        const groups = getLocationGroups(sortedData);
        listEl.innerHTML = "";
        feedEl.innerHTML = `<p class="location-placeholder">Select a location from the left to load its photos.</p>`;

        const showEntries = (location, entries, button) => {
            listEl.querySelectorAll(".location-btn.active").forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            feedEl.innerHTML = `
                <h3>${location}</h3>
                <p>${entries.length} entr${entries.length === 1 ? "y" : "ies"} documented.</p>
                <div class="location-entries"></div>
            `;

            const entriesContainer = feedEl.querySelector(".location-entries");
            entries.forEach(entry => entriesContainer.appendChild(buildEntryCard(entry)));
        };

        let firstButton = null;
        const sortedGroups = Array.from(groups.entries()).sort(([, a], [, b]) => b.length - a.length);

        sortedGroups.forEach(([location, entries]) => {
            const button = document.createElement("button");
            button.className = "location-btn";
            button.textContent = `${location} (${entries.length})`;
            button.onclick = () => showEntries(location, entries, button);
            listEl.appendChild(button);
            if (!firstButton) {
                firstButton = button;
            }
        });

        if (firstButton) {
            firstButton.click();
        }
    };

    global.LocationExplorerModule = {
        renderLocations
    };
})(window);
