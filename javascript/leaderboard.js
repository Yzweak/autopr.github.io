document.addEventListener('DOMContentLoaded', () => {
    const columns = [
        { key: 'model', label: 'Model', type: 'string', allowHtml: true, align: 'left' },
        { key: 'method', label: 'Method', type: 'string', align: 'left' },
        { key: 'model_size', label: 'Model Size', type: 'string' },
        { key: 'fidelity_att', label: 'A&T Acc.', type: 'number', category: 'Fidelity' },
        { key: 'factual_score', label: 'Factual Score', type: 'number', category: 'Fidelity' },
        { key: 'hook', label: 'Hook', type: 'number', category: 'Engagement' },
        { key: 'logical_attr', label: 'Logical Attr.', type: 'number', category: 'Engagement' },
        { key: 'visual_attr', label: 'Visual Attr.', type: 'number', category: 'Engagement' },
        { key: 'cta', label: 'CTA', type: 'number', category: 'Engagement' },
        { key: 'prof_pref', label: 'Prof. Pref.', type: 'number', category: 'Engagement' },
        { key: 'broad_pref', label: 'Broad Pref.', type: 'number', category: 'Engagement' },
        { key: 'context_rel', label: 'Context Rel.', type: 'number', category: 'Alignment' },
        { key: 'vis_txt_integ', label: 'Vis-Txt Integ.', type: 'number', category: 'Alignment' },
        { key: 'hashtag', label: 'Hashtag', type: 'number', category: 'Alignment' },
        { key: 'plat_pref', label: 'Plat. Pref.', type: 'number', category: 'Alignment' },
        { key: 'avg', label: 'Avg.', type: 'number', category: 'Overall', cellClass: 'metric-avg' }
    ];

    const table = document.getElementById('leaderboard-table');
    const categoryRow = document.getElementById('leaderboard-category-row');
    const headerRow = document.getElementById('leaderboard-header-row');
    const tableBody = table.querySelector('tbody');
    const coreButton = document.getElementById('btn-core');
    const fullButton = document.getElementById('btn-full');

    const stripHtml = (value) => {
        if (typeof value !== 'string') {
            return '';
        }
        return value.replace(/<[^>]*>/g, '');
    };

    const parseTimelineConfig = () => {
        const source = Array.isArray(window.autoPrTimeline) ? window.autoPrTimeline : [];
        const parsed = source.map((entry, index) => {
            const label = entry.label || `Update ${String(index + 1).padStart(2, '0')}`;
            const title = entry.title || 'Leaderboard Update';
            const summary = entry.summary || '';

            let dateObject = null;
            if (entry.date) {
                const temp = new Date(entry.date);
                if (!Number.isNaN(temp.valueOf())) {
                    dateObject = temp;
                }
            }

            const coreAvg = typeof entry.coreAvg === 'number' ? entry.coreAvg : null;
            const fullAvg = typeof entry.fullAvg === 'number' ? entry.fullAvg : null;

            return {
                index,
                label,
                title,
                summary,
                dateObject,
                rawDate: entry.date || '',
                coreAvg,
                coreModel: entry.coreModel || '',
                fullAvg,
                fullModel: entry.fullModel || ''
            };
        });

        parsed.sort((a, b) => {
            if (a.dateObject && b.dateObject) {
                return a.dateObject - b.dateObject;
            }
            if (a.dateObject) {
                return -1;
            }
            if (b.dateObject) {
                return 1;
            }
            return a.index - b.index;
        });

        let runningCore = null;
        let runningFull = null;

        parsed.forEach((event) => {
            if (typeof event.coreAvg === 'number') {
                if (runningCore === null || event.coreAvg > runningCore) {
                    runningCore = event.coreAvg;
                    event.coreGain = true;
                } else {
                    event.coreGain = false;
                }
            } else {
                event.coreGain = false;
            }

            if (typeof event.fullAvg === 'number') {
                if (runningFull === null || event.fullAvg > runningFull) {
                    runningFull = event.fullAvg;
                    event.fullGain = true;
                } else {
                    event.fullGain = false;
                }
            } else {
                event.fullGain = false;
            }

            event.runningCore = runningCore;
            event.runningFull = runningFull;
        });

        return parsed;
    };

    const renderTimeline = (events) => {
        const container = document.getElementById('leaderboard-timeline');
        if (!container) {
            return;
        }

        container.innerHTML = '';

        events.forEach((event) => {
            const dateLabel = event.dateObject
                ? event.dateObject.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : event.rawDate;
            const metrics = [];

            if (event.runningCore !== null) {
                const coreLabel = [
                    'Core',
                    `${event.runningCore.toFixed(2)}%`,
                    stripHtml(event.coreModel || '')
                ].filter(Boolean).join(' · ');
                metrics.push(
                    `<span class="metric-chip ${event.coreGain ? 'gain' : ''}">${coreLabel}</span>`
                );
            }

            if (event.runningFull !== null) {
                const fullLabel = [
                    'Full',
                    `${event.runningFull.toFixed(2)}%`,
                    stripHtml(event.fullModel || '')
                ].filter(Boolean).join(' · ');
                metrics.push(
                    `<span class="metric-chip ${event.fullGain ? 'gain' : ''}">${fullLabel}</span>`
                );
            }

            const summaryText = event.summary || 'Milestone recorded on the leaderboard.';

            const item = document.createElement('div');
            item.classList.add('timeline-item');
            item.innerHTML = `
                <span class="timeline-date">${event.label}${dateLabel ? ` · ${dateLabel}` : ''}</span>
                <div class="timeline-title">${event.title}</div>
                <div class="timeline-metrics">${metrics.join('')}</div>
                <p class="timeline-text">${summaryText}</p>
            `;
            container.appendChild(item);
        });
    };

    const buildChart = (canvasId, label, color, events, valueKey, modelKey) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') {
            return null;
        }

        const points = events
            .filter((event) => event[valueKey] !== null)
            .map((event) => ({
                date: event.dateObject,
                label: event.label,
                value: event[valueKey],
                model: stripHtml(event[modelKey] || ''),
                displayDate: event.dateObject
                    ? event.dateObject.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : event.rawDate
            }));

        if (!points.length) {
            return null;
        }

        const hasDates = points.every((point) => point.date instanceof Date);
        const context = canvas.getContext('2d');
        if (!context) {
            return null;
        }

        const baseDataset = {
            label,
            borderColor: color,
            backgroundColor: `${color}20`,
            tension: 0.25,
            pointRadius: 4,
            pointHitRadius: 12,
            pointHoverRadius: 7,
            pointHoverBorderWidth: 2,
            fill: false
        };

        const config = {
            type: 'line',
            data: {},
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                    axis: 'x'
                },
                events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (tooltipItems) => {
                                if (!tooltipItems.length) {
                                    return '';
                                }
                                const tooltip = tooltipItems[0];
                                if (hasDates) {
                                    const point = points[tooltip.dataIndex];
                                    if (point.date instanceof Date) {
                                        return `${point.label} · ${point.displayDate}`;
                                    }
                                }
                                return points[tooltip.dataIndex].label;
                            },
                            label: (tooltipItem) => {
                                const point = points[tooltipItem.dataIndex];
                                return `${label}: ${point.value.toFixed(2)}%`;
                            },
                            afterLabel: (tooltipItem) => {
                                const point = points[tooltipItem.dataIndex];
                                if (point.model) {
                                    return `Model: ${point.model}`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            color: '#444',
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        ticks: {
                            callback: (value) => `${value}%`,
                            color: '#444'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.06)'
                        }
                    }
                }
            }
        };

        if (hasDates) {
            config.data = {
                datasets: [
                    {
                        ...baseDataset,
                        parsing: false,
                        data: points.map((point) => ({
                            x: point.date instanceof Date ? point.date.getTime() : point.date,
                            y: point.value
                        }))
                    }
                ]
            };
            config.options.scales.x.type = 'time';
            config.options.scales.x.time = {
                unit: 'month',
                displayFormats: {
                    month: 'MMM yyyy'
                }
            };
            config.options.scales.x.min = new Date('2025-09-29T00:00:00Z').getTime();
        } else {
            config.data = {
                labels: points.map((point) => point.label),
                datasets: [
                    {
                        ...baseDataset,
                        data: points.map((point) => point.value)
                    }
                ]
            };
            config.options.scales.x.type = 'category';
        }

        return new Chart(context, config);
    };

    const renderSotaCharts = (events) => {
        buildChart(
            'leaderboard-sota-core',
            'PRBench-Core',
            '#2774AE',
            events,
            'runningCore',
            'coreModel'
        );
        buildChart(
            'leaderboard-sota-full',
            'PRBench-Full',
            '#F59F45',
            events,
            'runningFull',
            'fullModel'
        );
    };

    const columnClassForType = (type) => {
        if (type === 'number') {
            return 'js-sort-number';
        }
        if (type === 'string') {
            return 'js-sort';
        }
        return '';
    };

    const buildHeader = () => {
        categoryRow.innerHTML = '';
        headerRow.innerHTML = '';

        let index = 0;
        while (index < columns.length) {
            const column = columns[index];
            const category = column.category;
            if (category) {
                let span = 1;
                while (
                    index + span < columns.length &&
                    columns[index + span].category === category
                ) {
                    span += 1;
                }
                const th = document.createElement('th');
                th.colSpan = span;
                th.textContent = category;
                th.classList.add('category-group');
                th.classList.add('js-sort-none');
                categoryRow.appendChild(th);
                index += span;
            } else {
                const th = document.createElement('th');
                th.classList.add('category-placeholder');
                th.innerHTML = '&nbsp;';
                th.setAttribute('aria-hidden', 'true');
                th.classList.add('js-sort-none');
                categoryRow.appendChild(th);
                index += 1;
            }
        }

        columns.forEach((column) => {
            const th = document.createElement('th');
            const sortClass = columnClassForType(column.type);
            if (sortClass) {
                th.classList.add(sortClass);
            } else {
                th.classList.add('js-sort');
            }
            if (column.align === 'left') {
                th.classList.add('align-left');
            }
            th.innerHTML = `<span class="header-metric">${column.label}</span>`;
            headerRow.appendChild(th);
        });
    };

    const formatValue = (value, type) => {
        if (value === null || value === undefined || Number.isNaN(value)) {
            return 'N/A';
        }

        if (type === 'number') {
            return value.toFixed(2);
        }

        return value;
    };

    const applyRowClass = (method, row) => {
        const normalized = (method || '').toLowerCase();
        if (normalized === 'pragent') {
            row.classList.add('variant-pragent');
        } else if (normalized === 'human') {
            row.classList.add('variant-human');
        }
    };

    const populateTable = (data) => {
        tableBody.innerHTML = '';

        data.forEach((item) => {
            const row = document.createElement('tr');
            applyRowClass(item.method, row);

            columns.forEach((column) => {
                const cell = document.createElement('td');
                if (column.align === 'left') {
                    cell.classList.add('align-left');
                }
                if (column.cellClass) {
                    cell.classList.add(column.cellClass);
                }

                const rawValue = item[column.key];
                const displayValue = formatValue(rawValue, column.type);

                if (column.type === 'number') {
                    cell.textContent = displayValue;
                } else if (column.allowHtml) {
                    cell.innerHTML = displayValue;
                } else {
                    cell.textContent = displayValue;
                }

                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
    };

    const setActiveButton = (activeButton, inactiveButton) => {
        activeButton.classList.add('active');
        inactiveButton.classList.remove('active');
    };

    const resetSortState = () => {
        headerRow.querySelectorAll('.js-sort-active').forEach((cell) => {
            cell.classList.remove('js-sort-active');
        });
        table.className = (table.className || '')
            .replace(/js-sort-\\d+/g, '')
            .replace(/js-sort-(asc|desc)/g, '')
            .trim();
        if (!table.classList.contains('js-sort-table')) {
            table.classList.add('js-sort-table');
        }
    };

    buildHeader();
    populateTable(prBenchCoreData);
    setActiveButton(coreButton, fullButton);

    coreButton.addEventListener('click', () => {
        populateTable(prBenchCoreData);
        setActiveButton(coreButton, fullButton);
        resetSortState();
    });

    fullButton.addEventListener('click', () => {
        populateTable(prBenchFullData);
        setActiveButton(fullButton, coreButton);
        resetSortState();
    });

    const timelineEvents = parseTimelineConfig();
    renderTimeline(timelineEvents);
    renderSotaCharts(timelineEvents);
});
