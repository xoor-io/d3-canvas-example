let dataExample = [];

for (let i = 0; i < 10000; i++) {
    const x = Math.floor(Math.random() * 999999) + 1;
    const y = Math.floor(Math.random() * 999999) + 1;
    dataExample.push([x, y]);
}

const pointColor = '#3585ff'

const margin = { top: 20, right: 15, bottom: 60, left: 70 };
const outerWidth = 800;
const outerHeight = 600;
const width = outerWidth - margin.left - margin.right;
const height = outerHeight - margin.top - margin.bottom;

const container = d3.select('.scatter-container');

let lastTransform = null;

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
    .attr('x', `-${height / 2}`)
    .attr('dy', '-3.5em')
    .attr('transform', 'rotate(-90)')
    .text('Axis Y');
svgChart.append('text')
    .attr('x', `${width / 2}`)
    .attr('y', `${height + 40}`)
    .text('Axis X');

// Draw plot on canvas
function draw(transform) {
    lastTransform = transform;

    const scaleX = transform.rescaleX(x);
    const scaleY = transform.rescaleY(y);

    gxAxis.call(xAxis.scale(scaleX));
    gyAxis.call(yAxis.scale(scaleY));

    context.clearRect(0, 0, width, height);

    dataExample.forEach(point => {
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

//Box Zoom

const svgChartParent = d3.select('svg');
const zoomButton = toolsList.select('#zoom').on('click', () => {
    d3.selectAll('.active').classed('active', false);
    zoomButton.classed('active', true);
    canvasChart.style('z-index', 1);
    svgChartParent.style('z-index', 0);
});

const brushButton = toolsList.select('#brush').on('click', () => {
    d3.selectAll('.active').classed('active', false);
    brushButton.classed('active', true);
    canvasChart.style('z-index', 0);
    svgChartParent.style('z-index', 1);
});

const brush = d3.brush().extent([[0, 0], [width, height]])
    .on("start", () => { brush_startEvent(); })
    .on("brush", () => { brush_brushEvent(); })
    .on("end", () => { brush_endEvent(); })
    .on("start.nokey", function() {
        d3.select(window).on("keydown.brush keyup.brush", null);
    });

const brushSvg = svgChart
    .append("g")
    .attr("class", "brush")
    .call(brush)
    .on("keydown.brush", null)
    .on("keyup.brush", null);

let brushStartPoint = null;

function brush_startEvent() {
    const sourceEvent = d3.event.sourceEvent;
    const selection = d3.event.selection;
    if (sourceEvent.type === 'mousedown') {
        brushStartPoint = {
            mouse: {
                x: sourceEvent.screenX,
                y: sourceEvent.screenY
            },
            x: selection[0][0],
            y: selection[0][1]
        }
    } else {
        brushStartPoint = null;
    }
}

function brush_brushEvent() {
    if (brushStartPoint !== null) {
        const scale = width / height;
        const sourceEvent = d3.event.sourceEvent;
        const mouse = {
            x: sourceEvent.screenX,
            y: sourceEvent.screenY
        };
        if (mouse.x < 0) { mouse.x = 0; }
        if (mouse.y < 0) { mouse.y = 0; }
        let distance = mouse.y - brushStartPoint.mouse.y;
        let yPosition = brushStartPoint.y + distance;
        let xCorMulti = 1;

        if ((distance < 0 && mouse.x > brushStartPoint.mouse.x) || (distance > 0 && mouse.x < brushStartPoint.mouse.x)) {
            xCorMulti = -1;
        }

        if (yPosition > height) {
            distance = height - brushStartPoint.y;
            yPosition = height;
        } else if (yPosition < 0) {
            distance = -brushStartPoint.y;
            yPosition = 0;
        }

        let xPosition = brushStartPoint.x + distance * scale * xCorMulti;
        const oldDistance = distance;

        if (xPosition > width) {
            distance = (width - brushStartPoint.x) / scale;
            xPosition = width;
        } else if (xPosition < 0) {
            distance = brushStartPoint.x / scale;
            xPosition = 0;
        }

        if (oldDistance !== distance) {
            distance *= (oldDistance < 0) ? -1 : 1;
            yPosition = brushStartPoint.y + distance;
        }

        const selection = svgChart.select(".selection");

        const posValue = Math.abs(distance);
        selection.attr('width', posValue * scale).attr('height', posValue);

        if (xPosition < brushStartPoint.x) {
            selection.attr('x', xPosition);
        }
        if (yPosition < brushStartPoint.y) {
            selection.attr('y', yPosition);
        }

        const minX = Math.min(brushStartPoint.x, xPosition);
        const maxX = Math.max(brushStartPoint.x, xPosition);
        const minY = Math.min(brushStartPoint.y, yPosition);
        const maxY = Math.max(brushStartPoint.y, yPosition);

        lastSelection = { x1: minX, x2: maxX, y1: minY, y2: maxY };
    }
}


function brush_endEvent() {
    const s = d3.event.selection;
    if (!s && lastSelection !== null) {
        // Re-scale axis for the last transformation
        let zx = lastTransform.rescaleX(x);
        let zy = lastTransform.rescaleY(y);

        // Calc distance on Axis-X to use in scale
        let totalX = Math.abs(lastSelection.x2 - lastSelection.x1);

        // Get current point [x,y] on canvas
        const originalPoint = [zx.invert(lastSelection.x1), zy.invert(lastSelection.y1)];
        // Calc scale mapping distance AxisX in width * k
        // Example: Scale 1, width: 830, totalX: 415
        // Result in a zoom of 2
        const t = d3.zoomIdentity.scale(((width * lastTransform.k) / totalX));
        // Re-scale axis for the new transformation
        zx = t.rescaleX(x);
        zy = t.rescaleY(y);
        // Call zoomFunction with a new transformation from the new scale and brush position.
        // To calculate the brush position we use the originalPoint in the new Axis Scale.
        // originalPoint was obtained from inverse so we need to mul by -1
        canvasChart
            .transition()
            .duration(200)
            .ease(d3.easeLinear)
            .call(zoom_function.transform,
                d3.zoomIdentity
                    .translate(zx(originalPoint[0]) * -1, zy(originalPoint[1]) * -1)
                    .scale(t.k));
        lastSelection = null;
    } else {
        brushSvg.call(brush.move, null);
    }
}
