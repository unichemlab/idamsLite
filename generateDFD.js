const fs = require('fs');
const path = require('path');

// ===== CONFIG =====
const backendPath = './backend/src';
const frontendPath = './frontend/src';
const externalEntities = ['User'];
const maxNodesPerFile = 200; // split diagram if too many nodes

// ===== HELPER FUNCTIONS =====
function scanFolder(folder) {
    if(!fs.existsSync(folder)) return [];
    return fs.readdirSync(folder).filter(f => fs.statSync(path.join(folder,f)).isDirectory());
}

function scanFiles(folder, extensions=['.js','.ts','.jsx','.tsx']) {
    if(!fs.existsSync(folder)) return [];
    const files = [];
    fs.readdirSync(folder).forEach(item => {
        const fullPath = path.join(folder, item);
        const stat = fs.statSync(fullPath);
        if(stat.isDirectory()) {
            files.push(...scanFiles(fullPath, extensions));
        } else if(extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
        }
    });
    return files;
}

// Clean node ID to be Mermaid-safe
function safeId(name) {
    return name.replace(/[^a-zA-Z0-9_]/g,'_');
}

// ===== GENERATE DFD =====
function generateDFD() {
    const frontendModules = scanFolder(frontendPath);
    const backendModules = scanFolder(backendPath);

    let nodesCount = 0;
    let fileIndex = 1;
    let mermaid = `flowchart TD\n\n`;
    mermaid += `classDef entity fill:#f9f,stroke:#333,stroke-width:1px;\n`;
    mermaid += `classDef process fill:#bbf,stroke:#333,stroke-width:1px;\n`;
    mermaid += `classDef datastore fill:#bfb,stroke:#333,stroke-width:1px;\n\n`;

    externalEntities.forEach(e => {
        mermaid += `    ${safeId(e)}([${e}]):::entity\n`;
        nodesCount++;
    });

    const addFile = () => {
        fs.writeFileSync(`dfd_combined_safe_${fileIndex}.md`, `\`\`\`mermaid\n${mermaid}\n\`\`\``);
        console.log(`✅ File generated: dfd_combined_safe_${fileIndex}.md`);
        fileIndex++;
        nodesCount = 0;
        mermaid = `flowchart TD\n\n`;
        mermaid += `classDef entity fill:#f9f,stroke:#333,stroke-width:1px;\n`;
        mermaid += `classDef process fill:#bbf,stroke:#333,stroke-width:1px;\n`;
        mermaid += `classDef datastore fill:#bfb,stroke:#333,stroke-width:1px;\n\n`;
        externalEntities.forEach(e => {
            mermaid += `    ${safeId(e)}([${e}]):::entity\n`;
        });
    };

    frontendModules.forEach(mod => {
        const fFiles = scanFiles(path.join(frontendPath,mod));
        const bFiles = backendModules
            .filter(bmod => bmod.toLowerCase() === mod.toLowerCase())
            .flatMap(bmod => scanFiles(path.join(backendPath,bmod)));

        const dataStores = bFiles.filter(f => f.toLowerCase().includes('model'))
            .map(f => path.basename(f).replace(/\..+$/,''));

        if(fFiles.length===0 && bFiles.length===0 && dataStores.length===0) return;

        // Frontend subgraph
        if(fFiles.length>0) {
            mermaid += `subgraph Frontend_${safeId(mod)}["${mod} Frontend"]\n`;
            fFiles.forEach(f => {
                const id = `${safeId(mod)}_FE_${safeId(path.basename(f).replace(/\..+$/,''))}`;
                mermaid += `    ${id}(${path.basename(f).replace(/\..+$/,'')}):::process\n`;
                nodesCount++;
                if(nodesCount >= maxNodesPerFile) addFile();
            });
            mermaid += `end\n\n`;
        }

        // Backend subgraph
        if(bFiles.length>0) {
            mermaid += `subgraph Backend_${safeId(mod)}["${mod} Backend"]\n`;
            bFiles.forEach(f => {
                const id = `${safeId(mod)}_BE_${safeId(path.basename(f).replace(/\..+$/,''))}`;
                mermaid += `    ${id}(${path.basename(f).replace(/\..+$/,'')}):::process\n`;
                nodesCount++;
                if(nodesCount >= maxNodesPerFile) addFile();
            });
            mermaid += `end\n\n`;
        }

        // DataStores subgraph
        if(dataStores.length>0) {
            mermaid += `subgraph DataStores_${safeId(mod)}["${mod} DataStores"]\n`;
            dataStores.forEach(d => {
                const id = `${safeId(mod)}_DS_${safeId(d)}`;
                mermaid += `    ${id}[${d}]:::datastore\n`;
                nodesCount++;
                if(nodesCount >= maxNodesPerFile) addFile();
            });
            mermaid += `end\n\n`;
        }

        // Connections: External -> Frontend -> Backend -> DataStore
        fFiles.forEach(f => {
            const fId = `${safeId(mod)}_FE_${safeId(path.basename(f).replace(/\..+$/,''))}`;
            externalEntities.forEach(e => {
                mermaid += `    ${safeId(e)} --> ${fId}\n`;
                nodesCount++;
                if(nodesCount >= maxNodesPerFile) addFile();
            });
            bFiles.forEach(b => {
                const bId = `${safeId(mod)}_BE_${safeId(path.basename(b).replace(/\..+$/,''))}`;
                mermaid += `    ${fId} --> ${bId}\n`;
                nodesCount++;
                if(nodesCount >= maxNodesPerFile) addFile();
            });
        });

        bFiles.forEach(b => {
            const bId = `${safeId(mod)}_BE_${safeId(path.basename(b).replace(/\..+$/,''))}`;
            dataStores.forEach(d => {
                const dId = `${safeId(mod)}_DS_${safeId(d)}`;
                mermaid += `    ${bId} --> ${dId}\n`;
                nodesCount++;
                if(nodesCount >= maxNodesPerFile) addFile();
            });
        });
    });

    // Write remaining nodes
    if(nodesCount>0) {
        fs.writeFileSync(`dfd_combined_safe_${fileIndex}.md`, `\`\`\`mermaid\n${mermaid}\n\`\`\``);
        console.log(`✅ File generated: dfd_combined_safe_${fileIndex}.md`);
    }

    console.log('✅ All safe combined DFDs generated successfully.');
}

// ===== RUN =====
generateDFD();
