let dataExample = [];

for (let i= 0; i < 10000; i++) {
    const x = Math.floor(Math.random() * 999999) + 1; 
    const y = Math.floor(Math.random() * 999999) + 1; 
    dataExample.push([x, y]);
}

const pointColor = '#3585ff'

const margin = {top: 20, right: 15, bottom: 60, left: 70};
const outerWidth = 800;
const outerHeight = 600;
const width = outerWidth - margin.left - margin.right;
const height = outerHeight - margin.top - margin.bottom;

const container = d3.select('.scatter-container');

// Init SVG
const svgChart = container.append('svg:svg')
    .attr('width', outerWidth)
    .attr('height', outerHeight)
    .attr('class', 'svg-plot')
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

// Init Canvas
const canvasChart = container.append('canvas')
    .attr('width', width)
    .attr('height', height)
    .style('margin-left', margin.left + 'px')
    .style('margin-top', margin.top + 'px')
    .attr('class', 'canvas-plot');

// Prepare buttons
const toolsList = container.select('.tools')
    .style('margin-top', margin.top + 'px')
    .style('visibility', 'visible');

toolsList.select('#reset').on('click', () => {
    const t = d3.zoomIdentity.translate(0, 0).scale(1);
    canvasChart.transition()
      .duration(200)
      .ease(d3.easeLinear)
      .call(zoom_function.transform, t)
});

const context = canvasChart.node().getContext('2d');

// Init Scales
const x = d3.scaleLinear().domain([0, d3.max(dataExample, (d) => d[0])]).range([0, width]).nice();
const y = d3.scaleLinear().domain([0, d3.max(dataExample, (d) => d[1])]).range([height, 0]).nice();

// Init Axis
const xAxis = d3.axisBottom(x);
const yAxis = d3.axisLeft(y);

// Add Axis
const gxAxis = svgChart.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis);

const gyAxis = svgChart.append('g')
    .call(yAxis);

// Add labels
svgChart.append('text')
    .attr('x', `-${height/2}`)
    .attr('dy', '-3.5em')
    .attr('transform', 'rotate(-90)')
    .text('Axis Y');
svgChart.append('text')
    .attr('x', `${width/2}`)
    .attr('y', `${height + 40}`)
    .text('Axis X');

// Draw plot on canvas
function draw(transform) {
    const scaleX = transform.rescaleX(x);
    const scaleY = transform.rescaleY(y);

    gxAxis.call(xAxis.scale(scaleX));
    gyAxis.call(yAxis.scale(scaleY));

    context.clearRect(0, 0, width, height);

    dataExample.forEach( point => {
        drawPoint(scaleX, scaleY, point, transform.k);
    });
}

// Initial draw made with no zoom
draw(d3.zoomIdentity)

function drawPoint(scaleX, scaleY, point, k) {
    context.beginPath();
    context.fillStyle = pointColor;
    const px = scaleX(point[0]);
    const py = scaleY(point[1]);

    context.arc(px, py, 1.2 * k, 0, 2 * Math.PI, true);
    context.fill();
}

// Zoom/Drag handler
const zoom_function = d3.zoom().scaleExtent([1, 1000])
    .on('zoom', () => {
        const transform = d3.event.transform;
        context.save();
        draw(transform);
        context.restore();
    });

canvasChart.call(zoom_function);
