// REST Catalog Management UI JavaScript

let currentNamespaces = [];
let currentSection = 'namespaces';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadNamespaces();
});

function setupEventListeners() {
    // Namespace form
    document.getElementById('namespace-form').addEventListener('submit', createNamespace);
    
    // Table form
    document.getElementById('table-form').addEventListener('submit', createTable);
    
    // View form
    document.getElementById('view-form').addEventListener('submit', createView);
}

function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(section + '-section').style.display = 'block';
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update section title
    const title = section.charAt(0).toUpperCase() + section.slice(1);
    document.getElementById('section-title').textContent = title;
    
    currentSection = section;
    refreshData();
}

function refreshData() {
    switch(currentSection) {
        case 'namespaces':
            loadNamespaces();
            break;
        case 'tables':
            loadNamespaces();
            loadTables();
            break;
        case 'views':
            loadNamespaces();
            loadViews();
            break;
    }
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertsContainer.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Namespace Management
async function loadNamespaces() {
    try {
        const response = await fetch('/v1/catalog/namespaces');
        const data = await response.json();
        
        currentNamespaces = data.namespaces || [];
        displayNamespaces();
        updateNamespaceSelects();
    } catch (error) {
        console.error('Error loading namespaces:', error);
        showAlert('Error loading namespaces: ' + error.message, 'danger');
    }
}

function displayNamespaces() {
    const container = document.getElementById('namespaces-list');
    
    if (currentNamespaces.length === 0) {
        container.innerHTML = '<div class="empty-state">No namespaces found. Create one to get started.</div>';
        return;
    }
    
    container.innerHTML = currentNamespaces.map(ns => `
        <div class="namespace-item">
            <div class="item-name">
                <strong>${ns.namespace.join('.')}</strong>
                ${Object.keys(ns.properties).length > 0 ? `<br><small class="text-muted">Properties: ${JSON.stringify(ns.properties)}</small>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteNamespace('${ns.namespace.join('%1F')}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

function updateNamespaceSelects() {
    const selects = [
        'table-namespace',
        'view-namespace',
        'tables-namespace-filter',
        'views-namespace-filter',
        'new-table-namespace'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            const isFilter = selectId.includes('filter');
            
            select.innerHTML = isFilter 
                ? '<option value="">Select a namespace...</option>'
                : '<option value="">Select a namespace...</option>';
            
            currentNamespaces.forEach(ns => {
                const option = document.createElement('option');
                option.value = ns.namespace.join('%1F');
                option.textContent = ns.namespace.join('.');
                select.appendChild(option);
            });
            
            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
}

async function createNamespace(event) {
    event.preventDefault();
    
    const levels = document.getElementById('namespace-levels').value.split(',').map(s => s.trim());
    const propertiesText = document.getElementById('namespace-properties').value.trim();
    
    let properties = {};
    if (propertiesText) {
        try {
            properties = JSON.parse(propertiesText);
        } catch (error) {
            showAlert('Invalid JSON in properties field', 'danger');
            return;
        }
    }
    
    try {
        const response = await fetch('/v1/catalog/namespaces', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                namespace: levels,
                properties: properties
            })
        });
        
        if (response.ok) {
            showAlert('Namespace created successfully', 'success');
            document.getElementById('namespace-form').reset();
            loadNamespaces();
        } else {
            const error = await response.json();
            showAlert('Error creating namespace: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Error creating namespace:', error);
        showAlert('Error creating namespace: ' + error.message, 'danger');
    }
}

async function deleteNamespace(namespaceName) {
    if (!confirm('Are you sure you want to delete this namespace? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/v1/catalog/namespaces/${namespaceName}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Namespace deleted successfully', 'success');
            loadNamespaces();
        } else {
            const error = await response.json();
            showAlert('Error deleting namespace: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Error deleting namespace:', error);
        showAlert('Error deleting namespace: ' + error.message, 'danger');
    }
}

// Table Management
async function loadTables() {
    const namespaceSelect = document.getElementById('tables-namespace-filter');
    const selectedNamespace = namespaceSelect.value;
    
    if (!selectedNamespace) {
        document.getElementById('tables-list').innerHTML = '<div class="empty-state">Select a namespace to view tables.</div>';
        return;
    }
    
    try {
        const response = await fetch(`/v1/catalog/namespaces/${selectedNamespace}/tables`);
        const data = await response.json();
        
        displayTables(data.identifiers || []);
    } catch (error) {
        console.error('Error loading tables:', error);
        showAlert('Error loading tables: ' + error.message, 'danger');
    }
}

function displayTables(tables) {
    const container = document.getElementById('tables-list');
    
    if (tables.length === 0) {
        container.innerHTML = '<div class="empty-state">No tables found in this namespace.</div>';
        return;
    }
    
    container.innerHTML = tables.map(table => `
        <div class="table-item">
            <div class="item-name">
                <strong>${table.name}</strong>
                <br><small class="text-muted">Namespace: ${table.namespace.join('.')}</small>
            </div>
            <div class="item-actions">
                <button class="btn btn-info btn-sm" onclick="viewTableDetails('${table.namespace.join('%1F')}', '${table.name}')">
                    Details
                </button>
                <button class="btn btn-warning btn-sm" onclick="showRenameTableModal('${table.namespace.join('%1F')}', '${table.name}')">
                    Rename
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteTable('${table.namespace.join('%1F')}', '${table.name}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

function fillSampleSchema() {
    const sampleSchema = {
        "type": "struct",
        "schema-id": 0,
        "fields": [
            {
                "id": 1,
                "name": "id",
                "required": true,
                "type": "long"
            },
            {
                "id": 2,
                "name": "name",
                "required": true,
                "type": "string"
            },
            {
                "id": 3,
                "name": "created_at",
                "required": true,
                "type": "timestamp"
            }
        ]
    };
    
    document.getElementById('table-schema').value = JSON.stringify(sampleSchema, null, 2);
}

async function createTable(event) {
    event.preventDefault();
    
    const namespace = document.getElementById('table-namespace').value;
    const name = document.getElementById('table-name').value;
    const schemaText = document.getElementById('table-schema').value;
    
    let schema;
    try {
        schema = JSON.parse(schemaText);
    } catch (error) {
        showAlert('Invalid JSON in schema field', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`/v1/catalog/namespaces/${namespace}/tables`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                schema: schema
            })
        });
        
        if (response.ok) {
            showAlert('Table created successfully', 'success');
            document.getElementById('table-form').reset();
            loadTables();
        } else {
            const error = await response.json();
            showAlert('Error creating table: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Error creating table:', error);
        showAlert('Error creating table: ' + error.message, 'danger');
    }
}

async function deleteTable(namespace, tableName) {
    if (!confirm(`Are you sure you want to delete table "${tableName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/v1/catalog/namespaces/${namespace}/tables/${tableName}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Table deleted successfully', 'success');
            loadTables();
        } else {
            const error = await response.json();
            showAlert('Error deleting table: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Error deleting table:', error);
        showAlert('Error deleting table: ' + error.message, 'danger');
    }
}

function showRenameTableModal(namespace, tableName) {
    const modal = new bootstrap.Modal(document.getElementById('renameTableModal'));
    
    document.getElementById('current-table-display').value = `${namespace.replace(/%1F/g, '.')}.${tableName}`;
    document.getElementById('current-table-namespace').value = namespace;
    document.getElementById('current-table-name').value = tableName;
    document.getElementById('new-table-name').value = tableName;
    
    // Set current namespace as default for new namespace
    document.getElementById('new-table-namespace').value = namespace;
    
    modal.show();
}

async function submitRenameTable() {
    const currentNamespace = document.getElementById('current-table-namespace').value;
    const currentName = document.getElementById('current-table-name').value;
    const newNamespace = document.getElementById('new-table-namespace').value;
    const newName = document.getElementById('new-table-name').value;
    
    const source = {
        namespace: currentNamespace.split('%1F'),
        name: currentName
    };
    
    const destination = {
        namespace: newNamespace.split('%1F'),
        name: newName
    };
    
    try {
        const response = await fetch('/v1/catalog/tables/rename', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source: source,
                destination: destination
            })
        });
        
        if (response.ok) {
            showAlert('Table renamed successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('renameTableModal')).hide();
            loadTables();
        } else {
            const error = await response.json();
            showAlert('Error renaming table: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Error renaming table:', error);
        showAlert('Error renaming table: ' + error.message, 'danger');
    }
}

async function viewTableDetails(namespace, tableName) {
    try {
        const response = await fetch(`/v1/catalog/namespaces/${namespace}/tables/${tableName}`);
        const data = await response.json();
        
        const detailsWindow = window.open('', '_blank', 'width=800,height=600');
        detailsWindow.document.write(`
            <html>
                <head>
                    <title>Table Details: ${tableName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        pre { background: #f5f5f5; padding: 10px; overflow: auto; }
                        h1 { color: #333; }
                    </style>
                </head>
                <body>
                    <h1>Table: ${tableName}</h1>
                    <h2>Namespace: ${namespace.replace(/%1F/g, '.')}</h2>
                    <h3>Metadata:</h3>
                    <pre>${JSON.stringify(data.metadata, null, 2)}</pre>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error loading table details:', error);
        showAlert('Error loading table details: ' + error.message, 'danger');
    }
}

// View Management
async function loadViews() {
    const namespaceSelect = document.getElementById('views-namespace-filter');
    const selectedNamespace = namespaceSelect.value;
    
    if (!selectedNamespace) {
        document.getElementById('views-list').innerHTML = '<div class="empty-state">Select a namespace to view views.</div>';
        return;
    }
    
    try {
        const response = await fetch(`/v1/catalog/namespaces/${selectedNamespace}/views`);
        const data = await response.json();
        
        displayViews(data.identifiers || []);
    } catch (error) {
        console.error('Error loading views:', error);
        showAlert('Error loading views: ' + error.message, 'danger');
    }
}

function displayViews(views) {
    const container = document.getElementById('views-list');
    
    if (views.length === 0) {
        container.innerHTML = '<div class="empty-state">No views found in this namespace.</div>';
        return;
    }
    
    container.innerHTML = views.map(view => `
        <div class="view-item">
            <div class="item-name">
                <strong>${view.name}</strong>
                <br><small class="text-muted">Namespace: ${view.namespace.join('.')}</small>
            </div>
            <div class="item-actions">
                <button class="btn btn-info btn-sm" onclick="viewViewDetails('${view.namespace.join('%1F')}', '${view.name}')">
                    Details
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteView('${view.namespace.join('%1F')}', '${view.name}')">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function createView(event) {
    event.preventDefault();
    
    const namespace = document.getElementById('view-namespace').value;
    const name = document.getElementById('view-name').value;
    const schemaText = document.getElementById('view-schema').value;
    const sql = document.getElementById('view-sql').value;
    
    let schema;
    try {
        schema = JSON.parse(schemaText);
    } catch (error) {
        showAlert('Invalid JSON in schema field', 'danger');
        return;
    }
    
    const viewVersion = {
        'version-id': 1,
        'timestamp-ms': Date.now(),
        'schema-id': 0,
        'summary': {},
        'representations': [{
            type: 'sql',
            sql: sql,
            dialect: 'spark'
        }],
        'default-namespace': namespace.split('%1F')
    };
    
    try {
        const response = await fetch(`/v1/catalog/namespaces/${namespace}/views`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                schema: schema,
                'view-version': viewVersion
            })
        });
        
        if (response.ok) {
            showAlert('View created successfully', 'success');
            document.getElementById('view-form').reset();
            loadViews();
        } else {
            const error = await response.json();
            showAlert('Error creating view: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Error creating view:', error);
        showAlert('Error creating view: ' + error.message, 'danger');
    }
}

async function deleteView(namespace, viewName) {
    if (!confirm(`Are you sure you want to delete view "${viewName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/v1/catalog/namespaces/${namespace}/views/${viewName}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('View deleted successfully', 'success');
            loadViews();
        } else {
            const error = await response.json();
            showAlert('Error deleting view: ' + error.message, 'danger');
        }
    } catch (error) {
        console.error('Error deleting view:', error);
        showAlert('Error deleting view: ' + error.message, 'danger');
    }
}

async function viewViewDetails(namespace, viewName) {
    try {
        const response = await fetch(`/v1/catalog/namespaces/${namespace}/views/${viewName}`);
        const data = await response.json();
        
        const detailsWindow = window.open('', '_blank', 'width=800,height=600');
        detailsWindow.document.write(`
            <html>
                <head>
                    <title>View Details: ${viewName}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        pre { background: #f5f5f5; padding: 10px; overflow: auto; }
                        h1 { color: #333; }
                    </style>
                </head>
                <body>
                    <h1>View: ${viewName}</h1>
                    <h2>Namespace: ${namespace.replace(/%1F/g, '.')}</h2>
                    <h3>Metadata:</h3>
                    <pre>${JSON.stringify(data.metadata, null, 2)}</pre>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error loading view details:', error);
        showAlert('Error loading view details: ' + error.message, 'danger');
    }
}