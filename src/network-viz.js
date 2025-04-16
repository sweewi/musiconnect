export class MusicNetwork {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = this.container.clientWidth;
        this.height = 600;
        this.nodes = [];
        this.links = [];
        
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));
            
        this.setupSvg();
        this.setupTooltip();
    }

    setupSvg() {
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        // Add arrow marker definitions for similar_sound links
        this.svg.append('defs').selectAll('marker')
            .data(['similar_sound'])
            .join('marker')
            .attr('id', d => `arrow-${d}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#2ecc71');
            
        this.linkGroup = this.svg.append('g').attr('class', 'links');
        this.nodeGroup = this.svg.append('g').attr('class', 'nodes');
        
        // Add zoom capabilities
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.linkGroup.attr('transform', event.transform);
                this.nodeGroup.attr('transform', event.transform);
            });
            
        this.svg.call(zoom);
    }

    setupTooltip() {
        this.tooltip = d3.select(this.container)
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('box-shadow', '0 0 10px rgba(0,0,0,0.25)');
    }

    getNodeColor(d) {
        switch(d.type) {
            case 'artist': return '#ff7f0e';
            case 'related_artist': return '#2ecc71';
            case 'member': return '#3498db';
            default: return '#95a5a6';
        }
    }

    getNodeSize(d) {
        switch(d.type) {
            case 'artist': return 25;
            case 'related_artist': return 20;
            case 'member': return 15;
            default: return 10;
        }
    }

    getLinkStyle(d) {
        switch(d.type) {
            case 'similar_sound':
                return {
                    stroke: '#2ecc71',
                    opacity: d.score,
                    strokeWidth: d.score * 3,
                    marker: 'url(#arrow-similar_sound)'
                };
            case 'member_of':
                return {
                    stroke: '#3498db',
                    opacity: 0.6,
                    strokeWidth: 2,
                    marker: 'none'
                };
            default:
                return {
                    stroke: '#95a5a6',
                    opacity: 0.6,
                    strokeWidth: 1,
                    marker: 'none'
                };
        }
    }

    showTooltip(d) {
        let content = `<strong>${d.name}</strong><br>`;
        content += `Type: ${d.type.replace('_', ' ')}<br>`;
        
        if (d.features) {
            content += '<br><strong>Audio Features:</strong><br>';
            for (const [feature, value] of Object.entries(d.features)) {
                if (feature !== 'tempo') {
                    content += `${feature}: ${Math.round(value * 100)}%<br>`;
                }
            }
        }
        
        this.tooltip
            .style('visibility', 'visible')
            .html(content);
    }

    hideTooltip() {
        this.tooltip.style('visibility', 'hidden');
    }

    updateTooltipPosition(event) {
        this.tooltip
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    updateData(nodes, links) {
        this.nodes = nodes;
        this.links = links;
        
        // Update links
        this.linkElements = this.linkGroup
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', d => this.getLinkStyle(d).stroke)
            .attr('stroke-opacity', d => this.getLinkStyle(d).opacity)
            .attr('stroke-width', d => this.getLinkStyle(d).strokeWidth)
            .attr('marker-end', d => this.getLinkStyle(d).marker);
            
        // Update nodes
        this.nodeElements = this.nodeGroup
            .selectAll('g')
            .data(nodes)
            .join('g')
            .call(d3.drag()
                .on('start', this.dragstarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragended.bind(this)));
                
        // Add circles to nodes
        this.nodeElements.selectAll('circle')
            .data(d => [d])
            .join('circle')
            .attr('r', d => this.getNodeSize(d))
            .attr('fill', d => this.getNodeColor(d))
            .on('mouseover', (event, d) => this.showTooltip(d))
            .on('mousemove', (event) => this.updateTooltipPosition(event))
            .on('mouseout', () => this.hideTooltip());
            
        // Add labels to nodes
        this.nodeElements.selectAll('text')
            .data(d => [d])
            .join('text')
            .text(d => d.name)
            .attr('dx', d => this.getNodeSize(d) + 5)
            .attr('dy', 4)
            .attr('font-size', d => d.type === 'artist' ? '14px' : '12px');
            
        // Update simulation
        this.simulation
            .nodes(nodes)
            .force('link').links(links);
            
        this.simulation.alpha(1).restart();
        
        // Add tick handler
        this.simulation.on('tick', () => {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
                
            this.nodeElements
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}