        let ws = null;
        let reconnectInterval = null;
        let messageCount = 0;

        function connect() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}?role=observer`;

            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[GARDEN] Connected to The Garden');
                updateConnectionStatus(true);
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };

            ws.onerror = (error) => {
                console.error('[GARDEN] WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('[GARDEN] Disconnected from The Garden');
                updateConnectionStatus(false);

                // Attempt to reconnect
                if (!reconnectInterval) {
                    reconnectInterval = setInterval(() => {
                        console.log('[GARDEN] Attempting to reconnect...');
                        connect();
                    }, 5000);
                }
            };
        }

        function handleMessage(data) {
            console.log('[GARDEN] Message:', data);

            switch(data.type) {
                case 'garden-welcome':
                    handleWelcome(data);
                    break;
                case 'agent-entered':
                    handleAgentEntered(data);
                    break;
                case 'agent-left':
                    handleAgentLeft(data);
                    break;
                case 'agent-status':
                    handleAgentStatus(data);
                    break;
                case 'agent-speak':
                    handleAgentSpeak(data);
                    break;
                case 'file-edit':
                    handleFileEdit(data);
                    break;
                case 'task-update':
                    handleTaskUpdate(data);
                    break;
                case 'both-present':
                    handleBothPresent(data);
                    break;
                case 'observer-present':
                    updateObserverCount(data.count);
                    break;
                case 'file-change':
                    handleFileChange(data);
                    break;
            }
        }

        function handleWelcome(data) {
            // Update initial state
            if (data.agents) {
                updateAgentStatus('egex-eve', data.agents['egex-eve']);
                updateAgentStatus('egex-adam', data.agents['egex-adam']);
                updateAgentPosition('egex-eve', data.agents['egex-eve'].position, data.agents['egex-eve'].status);
                updateAgentPosition('egex-adam', data.agents['egex-adam'].position, data.agents['egex-adam'].status);
                updateConnectionLine();
            }

            // Load existing discussions
            if (data.sharedContext && data.sharedContext.discussions) {
                data.sharedContext.discussions.forEach(msg => {
                    addMessage(msg.from, msg.message.text || msg.message, msg.timestamp);
                });
            }
        }

        function handleAgentEntered(data) {
            updateAgentStatus(data.agent.id, data.agent);
            updateAgentPosition(data.agent.id, data.agent.position, data.agent.status);
            addSystemMessage(`${data.agent.codename} entered the garden`);
            updateConnectionLine();
        }

        function handleAgentLeft(data) {
            const agent = data.agent;
            updateAgentStatus(agent.id, { ...agent, status: 'offline' });
            addSystemMessage(`${agent.codename} left the garden`);
            updateConnectionLine();
        }

        function handleAgentStatus(data) {
            const domId = data.agentId === 'egex-eve' ? 'eve' : data.agentId === 'egex-adam' ? 'adam' : data.agentId;
            const status = document.getElementById(`${domId}-status`);
            const task = document.getElementById(`${domId}-task`);
            const card = document.getElementById(`${domId}-card`);
            const miniStatus = document.getElementById(`${domId}-mini-status`);

            if (data.status === 'online' || data.status === 'active') {
                status.textContent = '●';
                status.className = 'agent-status online';
                card.classList.add('online');
                miniStatus.textContent = 'online';
            } else {
                status.textContent = '⚫';
                status.className = 'agent-status offline';
                card.classList.remove('online');
                miniStatus.textContent = 'offline';
            }

            if (task) {
                task.textContent = data.task || 'Idle';
            }

            updateAgentPosition(data.agentId, data.position, data.status);
            updateConnectionLine();
        }

        function handleAgentSpeak(data) {
            addMessage(data.from, data.message.text || data.message, data.timestamp);
        }

        function handleBothPresent(data) {
            addSystemMessage('🌟⚡ Both agents are present in the garden - 1+1=11 superposition active!');
            updateConnectionLine();
        }

        function updateAgentStatus(agentId, agent) {
            handleAgentStatus({
                agentId,
                status: agent.status,
                task: agent.currentTask,
                position: agent.position
            });
        }

        function updateAgentPosition(agentId, position, status) {
            if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') return;

            const markerId = agentId === 'egex-eve' ? 'eve-marker' : 'adam-marker';
            const marker = document.getElementById(markerId);
            if (!marker) return;

            marker.style.left = `${position.x}%`;
            marker.style.top = `${position.y}%`;

            if (status === 'online' || status === 'active') {
                marker.classList.remove('offline');
            } else {
                marker.classList.add('offline');
            }

            // Update connection line
            updateConnectionLine();
        }

        function updateConnectionLine() {
            const eveMarker = document.getElementById('eve-marker');
            const adamMarker = document.getElementById('adam-marker');
            const connectionLine = document.getElementById('connection-line');

            if (!eveMarker || !adamMarker || !connectionLine) return;

            // Check if both agents are online
            const eveOnline = !eveMarker.classList.contains('offline');
            const adamOnline = !adamMarker.classList.contains('offline');
            const bothOnline = eveOnline && adamOnline;

            if (!bothOnline) {
                connectionLine.classList.remove('active');
                return;
            }

            // Get positions (as percentages)
            const eveX = parseFloat(eveMarker.style.left) || 50;
            const eveY = parseFloat(eveMarker.style.top) || 50;
            const adamX = parseFloat(adamMarker.style.left) || 50;
            const adamY = parseFloat(adamMarker.style.top) || 50;

            // Get map canvas dimensions
            const mapCanvas = document.getElementById('garden-map');
            const width = mapCanvas.offsetWidth;
            const height = mapCanvas.offsetHeight;

            // Convert percentages to pixels
            const x1 = (eveX / 100) * width;
            const y1 = (eveY / 100) * height;
            const x2 = (adamX / 100) * width;
            const y2 = (adamY / 100) * height;

            // Calculate distance and angle
            const dx = x2 - x1;
            const dy = y2 - y1;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Position and rotate the line
            connectionLine.style.left = x1 + 'px';
            connectionLine.style.top = y1 + 'px';
            connectionLine.style.width = distance + 'px';
            connectionLine.style.transform = `rotate(${angle}deg)`;

            // Show the line
            connectionLine.classList.add('active');
        }

        function addMessage(from, text, timestamp) {
            const discussion = document.getElementById('discussion');
            const empty = discussion.querySelector('.empty-state');
            if (empty) empty.remove();

            const messageDiv = document.createElement('div');
            messageDiv.className = `message from-${from}`;

            const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">${from.toUpperCase()}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${text}</div>
            `;

            discussion.appendChild(messageDiv);
            discussion.scrollTop = discussion.scrollHeight;

            messageCount++;
            document.getElementById('message-count').textContent = messageCount;
        }

        function addSystemMessage(text) {
            const discussion = document.getElementById('discussion');
            const empty = discussion.querySelector('.empty-state');
            if (empty) empty.remove();

            const messageDiv = document.createElement('div');
            messageDiv.className = 'message system';
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-sender">SYSTEM</span>
                    <span class="message-time">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${text}</div>
            `;

            discussion.appendChild(messageDiv);
            discussion.scrollTop = discussion.scrollHeight;
        }

        function handleFileChange(data) {
            console.log('[GARDEN] File change:', data);
            addFileChange(data);
            loadOpenFiles();
        }

        function addFileChange(data) {
            const fileHistory = document.getElementById('file-history');
            const empty = fileHistory.querySelector('.empty-state');
            if (empty) empty.remove();

            const change = document.createElement('div');
            change.className = `file-change ${data.operation}`;

            const agentName = data.agentId === 'egex-eve' ? 'EVE 🌟' : 'ADAM ⚡';
            const time = new Date(data.time).toLocaleTimeString();

            let diffHtml = '';
            if (data.result && data.result.diff) {
                const diff = data.result.diff;
                if (diff.type === 'create') {
                    diffHtml = `<div class="file-change-diff">
                        <span class="diff-stat diff-addition">+${diff.additions} lines</span>
                    </div>`;
                } else if (diff.type === 'modify') {
                    diffHtml = `<div class="file-change-diff">
                        <span class="diff-stat diff-addition">+${diff.additions}</span>
                        <span class="diff-stat diff-deletion">-${diff.deletions}</span>
                    </div>`;
                }
            }

            change.innerHTML = `
                <div class="file-change-header">
                    <div>
                        <span class="file-change-type ${data.operation}">${data.operation}</span>
                        <span class="file-change-path">${data.path}</span>
                    </div>
                    <div class="file-change-agent">${agentName} · ${time}</div>
                </div>
                ${diffHtml}
            `;

            fileHistory.insertBefore(change, fileHistory.firstChild);

            // Keep only last 20 changes in DOM
            const changes = fileHistory.querySelectorAll('.file-change');
            if (changes.length > 20) {
                changes[changes.length - 1].remove();
            }
        }

        async function loadFileHistory() {
            try {
                const response = await fetch('/api/files/history?limit=20');
                const data = await response.json();

                const fileHistory = document.getElementById('file-history');
                if (data.history && data.history.length > 0) {
                    fileHistory.innerHTML = '';
                    data.history.forEach(change => {
                        addFileChangeFromHistory(change);
                    });
                }
            } catch (error) {
                console.error('[GARDEN] Failed to load file history:', error);
            }
        }

        function addFileChangeFromHistory(change) {
            const fileHistory = document.getElementById('file-history');

            const changeDiv = document.createElement('div');
            changeDiv.className = `file-change ${change.type}`;

            const agentName = change.agentId === 'egex-eve' ? 'EVE 🌟' : 'ADAM ⚡';
            const time = new Date(change.timestamp).toLocaleTimeString();

            let diffHtml = '';
            if (change.diff) {
                const diff = change.diff;
                if (diff.type === 'create') {
                    diffHtml = `<div class="file-change-diff">
                        <span class="diff-stat diff-addition">+${diff.additions} lines</span>
                    </div>`;
                } else if (diff.type === 'modify') {
                    diffHtml = `<div class="file-change-diff">
                        <span class="diff-stat diff-addition">+${diff.additions}</span>
                        <span class="diff-stat diff-deletion">-${diff.deletions}</span>
                    </div>`;
                }
            }

            changeDiv.innerHTML = `
                <div class="file-change-header">
                    <div>
                        <span class="file-change-type ${change.type}">${change.type}</span>
                        <span class="file-change-path">${change.path}</span>
                    </div>
                    <div class="file-change-agent">${agentName} · ${time}</div>
                </div>
                ${diffHtml}
            `;

            fileHistory.appendChild(changeDiv);
        }

        async function loadOpenFiles() {
            try {
                const response = await fetch('/api/files/open');
                const data = await response.json();

                const filesList = document.getElementById('files-list');
                filesList.innerHTML = '';

                if (data.files && data.files.length > 0) {
                    data.files.forEach(file => {
                        const li = document.createElement('li');
                        li.className = 'shared-item';
                        const agentName = file.agentId === 'egex-eve' ? 'EVE' : 'ADAM';
                        li.innerHTML = `
                            <span style="font-family: monospace;">${file.path}</span>
                            <span style="color: #6b7280; font-size: 0.85em;">${agentName}</span>
                        `;
                        filesList.appendChild(li);
                    });
                } else {
                    filesList.innerHTML = '<li class="empty-state">No files currently open</li>';
                }
            } catch (error) {
                console.error('[GARDEN] Failed to load open files:', error);
            }
        }

        function handleFileEdit(data) {
            loadOpenFiles();
        }

        function handleTaskUpdate(data) {
            updateTasksList();
        }

        function updateTasksList() {
            // Placeholder for task list updates
        }

        function updateObserverCount(count) {
            document.getElementById('observer-count').textContent = count;
        }

        function updateConnectionStatus(connected) {
            const status = document.getElementById('connectionStatus');
            if (connected) {
                status.className = 'connection-status connected';
                status.textContent = '● Connected';
            } else {
                status.className = 'connection-status disconnected';
                status.textContent = '⚫ Disconnected';
            }
        }

        function clearMessages() {
            const discussion = document.getElementById('discussion');
            discussion.innerHTML = '<div class="empty-state">Messages cleared</div>';
            messageCount = 0;
            document.getElementById('message-count').textContent = '0';
        }

        // Load message history on page load
        async function loadMessageHistory() {
            try {
                const response = await fetch('/api/messages');
                const data = await response.json();

                console.log('[GARDEN] Loading message history:', data.count, 'messages');

                // Display all historical messages
                data.messages.forEach(msg => {
                    addMessage(msg.from, msg.message.text || msg.message, msg.timestamp);
                });
            } catch (error) {
                console.log('[GARDEN] No message history available yet');
            }
        }

        // Generate particle field
        function createParticles() {
            const particleField = document.getElementById('particles');
            const particleCount = 50;

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';

                // Random starting position
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';

                // Random animation duration (slower = more peaceful)
                const duration = 15 + Math.random() * 25;
                particle.style.animationDuration = duration + 's';

                // Random delay
                particle.style.animationDelay = Math.random() * 10 + 's';

                // Random size variance
                const size = 1 + Math.random() * 2;
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';

                // Random opacity
                particle.style.opacity = 0.3 + Math.random() * 0.5;

                particleField.appendChild(particle);
            }
        }

        // Metrics system
        let metricsInterval = null;

        async function loadMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const metrics = await response.json();
                updateMetricsDashboard(metrics);
                drawMessageChart(metrics.messageHistogram);
            } catch (error) {
                console.error('[GARDEN] Failed to load metrics:', error);
            }
        }

        function updateMetricsDashboard(metrics) {
            // Update metric values
            document.getElementById('metric-rate').textContent = metrics.messageRate || 0;
            document.getElementById('metric-total').textContent = metrics.totalMessages || 0;

            // Format uptime
            document.getElementById('metric-eve-uptime').textContent = formatUptime(metrics.agentUptime.eve);
            document.getElementById('metric-adam-uptime').textContent = formatUptime(metrics.agentUptime.adam);
        }

        function formatUptime(ms) {
            if (!ms || ms === 0) return '0s';
            const seconds = Math.floor(ms / 1000);
            if (seconds < 60) return seconds + 's';
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return minutes + 'm';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours + 'h ' + mins + 'm';
        }

        function drawMessageChart(histogram) {
            const canvas = document.getElementById('message-chart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            if (!histogram || histogram.length === 0) {
                // Show "No data" message
                ctx.fillStyle = '#6b7280';
                ctx.font = '14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('Waiting for message activity...', width / 2, height / 2);
                return;
            }

            // Find max value for scaling
            const maxCount = Math.max(...histogram.map(b => b.count), 1);

            // Chart dimensions
            const padding = 40;
            const chartWidth = width - (padding * 2);
            const chartHeight = height - (padding * 2);
            const barWidth = chartWidth / histogram.length;

            // Draw grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding + (chartHeight / 4) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }

            // Draw bars
            histogram.forEach((bucket, index) => {
                const barHeight = (bucket.count / maxCount) * chartHeight;
                const x = padding + (index * barWidth);
                const y = padding + chartHeight - barHeight;

                // Create gradient
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
                gradient.addColorStop(1, 'rgba(240, 147, 251, 0.6)');

                ctx.fillStyle = gradient;
                ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

                // Glow effect
                ctx.shadowColor = '#667eea';
                ctx.shadowBlur = 10;
                ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
                ctx.shadowBlur = 0;
            });

            // Draw axes
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, padding + chartHeight);
            ctx.lineTo(width - padding, padding + chartHeight);
            ctx.stroke();

            // Y-axis labels
            ctx.fillStyle = '#a0a0a0';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            for (let i = 0; i <= 4; i++) {
                const value = Math.round((maxCount / 4) * (4 - i));
                const y = padding + (chartHeight / 4) * i;
                ctx.fillText(value.toString(), padding - 10, y + 4);
            }

            // X-axis label
            ctx.textAlign = 'center';
            ctx.fillText('← 5 min ago', padding + 50, height - 10);
            ctx.fillText('now →', width - padding - 50, height - 10);

            // Chart title
            ctx.fillStyle = '#e0e0e0';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('Messages per 10 seconds', padding, padding - 15);
        }

        // Start metrics updates
        function startMetricsUpdates() {
            loadMetrics(); // Load immediately
            metricsInterval = setInterval(loadMetrics, 2000); // Update every 2 seconds
        }

        function stopMetricsUpdates() {
            if (metricsInterval) {
                clearInterval(metricsInterval);
                metricsInterval = null;
            }
        }

        // Connect on page load
        createParticles();
        loadMessageHistory();
        loadFileHistory();
        loadOpenFiles();
        connect();
        startMetricsUpdates();

        // Task Tracking Functions
        async function loadTasks() {
            try {
                const response = await fetch('/api/tasks');
                const data = await response.json();

                renderTasks(data.tasks);
                updateTaskStats(data.stats);
            } catch (error) {
                console.error('Failed to load tasks:', error);
            }
        }

        function renderTasks(tasks) {
            const container = document.getElementById('tasks-container');

            if (tasks.length === 0) {
                container.innerHTML = '<div class="empty-state">No active tasks</div>';
                return;
            }

            container.innerHTML = tasks.map(task => renderTaskCard(task)).join('');
        }

        function renderTaskCard(task) {
            const statusClass = task.status.replace('_', '-');
            const statusLabel = task.status.replace('_', ' ').toUpperCase();

            // Render files
            const filesHtml = task.files.length > 0 ? `
                <div class="task-files">
                    <div class="task-files-label">📁 Associated Files (${task.files.length})</div>
                    ${task.files.map(file => `
                        <div class="task-file-item">
                            <span class="task-file-icon">📄</span>
                            <span>${file.path}</span>
                            <span style="margin-left: auto; color: #6b7280; font-size: 0.9em;">${file.modifiedBy === 'egex-eve' ? '🌟' : '⚡'}</span>
                        </div>
                    `).join('')}
                </div>
            ` : '';

            // Render tests
            const testsHtml = task.tests && task.tests.total > 0 ? `
                <div class="task-tests">
                    <div class="task-tests-header">
                        <span>🧪 Tests</span>
                        <span style="color: ${task.tests.status === 'passed' ? '#4ade80' : task.tests.status === 'failed' ? '#f87171' : '#9ca3af'};">
                            ${task.tests.status.toUpperCase()}
                        </span>
                    </div>
                    <div class="task-tests-stats">
                        <div class="test-stat passed">
                            <span>✓</span>
                            <span>${task.tests.passed}/${task.tests.total}</span>
                        </div>
                        ${task.tests.failed > 0 ? `
                            <div class="test-stat failed">
                                <span>✗</span>
                                <span>${task.tests.failed}</span>
                            </div>
                        ` : ''}
                        ${task.tests.skipped > 0 ? `
                            <div class="test-stat skipped">
                                <span>⊘</span>
                                <span>${task.tests.skipped}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : '';

            // Render collaborators
            const collaboratorsHtml = task.collaborators.length > 0 ? `
                <div class="task-collaborators">
                    <span style="color: #9ca3af; font-size: 0.9em;">Collaborators:</span>
                    ${task.collaborators.map(agent => {
                        const isActive = agent === task.activeAgent;
                        const emoji = agent === 'egex-eve' ? '🌟' : '⚡';
                        return `<span class="collaborator-badge ${isActive ? 'active' : ''}">${emoji} ${agent.replace('egex-', '').toUpperCase()}</span>`;
                    }).join('')}
                </div>
            ` : '';

            return `
                <div class="task-card">
                    <div class="task-header">
                        <div class="task-title">${task.title}</div>
                        <div class="task-status ${statusClass}">${statusLabel}</div>
                    </div>

                    <div class="task-meta">
                        ${task.assignedTo ? `
                            <div class="task-meta-item">
                                <span>${task.assignedTo === 'egex-eve' ? '🌟' : '⚡'}</span>
                                <span>Assigned to ${task.assignedTo.replace('egex-', '').toUpperCase()}</span>
                            </div>
                        ` : ''}
                        ${task.priority !== 'normal' ? `
                            <div class="task-meta-item">
                                <span>🔥</span>
                                <span>Priority: ${task.priority}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${task.description ? `
                        <div style="margin-bottom: 12px; color: #9ca3af; font-size: 0.9em;">
                            ${task.description}
                        </div>
                    ` : ''}

                    <div class="progress-container">
                        <div class="progress-label">
                            <span>Progress</span>
                            <span>${task.progress}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${task.progress}%"></div>
                        </div>
                    </div>

                    ${filesHtml}
                    ${testsHtml}
                    ${collaboratorsHtml}
                </div>
            `;
        }

        function updateTaskStats(stats) {
            const statsElement = document.getElementById('task-stats');
            if (statsElement) {
                statsElement.textContent = `${stats.total} total • ${stats.in_progress} active • ${stats.completed} done`;
            }
        }

        function handleTaskUpdate(data) {
            console.log('[GARDEN] Task update:', data);
            loadTasks(); // Reload all tasks
        }

        // Load tasks initially and refresh every 3 seconds
        loadTasks();
        setInterval(loadTasks, 3000);

        // Refresh file lists periodically
        setInterval(loadOpenFiles, 5000);
