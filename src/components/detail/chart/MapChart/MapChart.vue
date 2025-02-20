 <template>
<div class="map container">
    <map-tooltip v-if="currentHover"
        :x="currentHover.x"
        :y="currentHover.y"
        :unit="graphModel.config.valueTitle || graphModel.config.value"
        :number="currentHover.number"
        :name="currentHover.name"
    />
    <map-legend
        v-if="graphModel.graphData"
        v-hint:raw="graphModel.config.fullName"
        :scale="colorScale"
    />
    <svg class="map canvas">
        <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect x="0" y="0" width="50" height="50"/>
            <path d="M-1,1 l2,-2
                     M0,4 l4,-4
                     M3,5 l2,-2"
                  style="stroke:black; stroke-width:1"
            />
        </pattern>
        <g class="map group">
        </g>
    </svg>
</div>
</template>

<script>
import Vue from 'vue';
import _ from 'lodash';
import * as d3 from 'd3-selection';
import * as zoom from 'd3-zoom';
import * as geo from 'd3-geo';
import * as scales from 'd3-scale';
import * as d3_color from 'd3-scale-chromatic';
import { mapState } from 'vuex';
import eckert from './eckert3';
import worldBy from './world';

import MapLegend from './MapLegend';
import MapTooltip from './MapTooltip';
import config from '../../../../config';

const projection = geo.geoPath().projection(eckert());

export default {
    name: 'map-chart',
    props: ['graphModel'],

    components: {
        MapLegend,
        MapTooltip
    },

    data () {
        return {
            currentHover: null,
            colorScale: null,
            dataByCountry: null,
        }
    },

    mounted () {
        // if graphData is already ready, like on a chartType change,
        // the watch won't trigger, so we need to compute dataByCountry manually
        if (this.graphModel.graphData.length) {
            this.getDataByCountry();
        }
    },

    watch: {
        // NOTE: have to set dependents of graphModel at the same time
        // by watching instead of chained computeds, in order to prevent
        // double-triggering of init/draw
        'graphModel.graphData' () {
            if (!this.graphModel.graphData.length) return;

            this.getDataByCountry();
        },
        world () {
            this.drawChoropleth();
        },
        fullscreen () {
            this.configureZoom();
        },
    },

    computed: Object.assign(
        mapState('detail', [
            'fullscreen',
        ]), {
            world () {
                if (!this.colorScale || !this.dataByCountry) return;
                return worldBy(this.colorScale, this.dataByCountry);
            },

            constants () {
                return Object.assign({
                        x0: -10, y0: -10, x1: 1000, y1: 500,

                    }, this.mobile ?        { scale: 0.60, xi: -120, yi: -10 } :
                       this.fullscreen ?    { scale: 1.08, xi: -60, yi: -35 } :
                                            { scale: 0.88, xi: -125, yi: 0 },
                )
            },

            mobile () {
                return this.$mq === 'mobile';
            },
        }
    ),

    methods: {
        getDataByCountry () {
            const colorPalette = d3_color.interpolateGnBu;
            let {min, max} = this.graphModel.getMinMax();
            const d3s = scales.scaleLog()
                    .domain([min, max])
                    .range([0, 1]);
            const scale = (number) => {
                if (!number) return '#f6f6f7';
                return colorPalette(d3s(number));
            };
            scale.min = min;
            scale.max = max;
            this.colorScale = scale;

            this.dataByCountry = this.graphModel.graphData.reduce((p,c) => {
                p[c.country] = c.total.total;
                return p;
            }, {});
        },

        drawChoropleth () {
            const self = this;

            const svg = d3.select('.map.canvas');
            const g = svg.select('g.map.group');

            g.selectAll('*').remove();
            const paths = g.selectAll('path').data(this.world)
                .enter().append('path')
                    .attr('d', projection)
                    .attr('fill', '#fff')
                    .attr('class', function (feature) {
                        return 'country ' + feature.id;
                    }).attr('fill', function (feature) {
                        return feature.properties.color;
                    }).on('mousemove', function (d) {
                        if (d.properties.number) {
                            const diagonalHatch = d3.select('#diagonalHatch')
                            d3.select(diagonalHatch.node().firstChild).style('fill', d.properties.color);
                            d3.select(this).attr('fill', 'url(#diagonalHatch)');
                            const svgBBox = svg.node().getBBox();
                            self.currentHover = {
                                name: d.properties.name,
                                number: d.properties.number,
                                x: d3.event.layerX,
                                y: d3.event.layerY
                            };
                        }
                    }).on('mouseout', function (d) {
                        d3.select(this).attr('fill', d.properties.color);
                        self.currentHover = null;
                    });

            this.configureZoom(svg, g);
        },
        configureZoom (svg, g) {
            svg = svg || d3.select('.map.canvas');
            g = g || svg.select('g.map.group');

            const c = this.constants;
            const t = zoom.zoomTransform(g).translate(c.xi, c.yi).scale(c.scale);

            const zoomBehavior = zoom.zoom()
                .scaleExtent([c.scale-0.2, 16])
                .translateExtent([[c.x0, c.y0],[c.x1, c.y1]])
                .on('zoom', () => {
                    g.attr('transform', d3.event.transform);
                });
            svg.call(zoomBehavior).on('wheel', function () { d3.event.preventDefault(); });
            svg.call(zoomBehavior.transform, t);
        },
    }
};
</script>

<style>
.map.canvas {
    width: 100%;
    height: 400px;
    margin-bottom:40px;
}
.country {
    stroke: #555;
    stroke-width: 0.5px;
    vector-effect: non-scaling-stroke;
}
@media(max-width: 450px) {
    .map.canvas {
        height: 250px;
    }
}
</style>
