import _ from '../lodash-custom-bundle';

const months = [
    null,
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

const colors = {
    contributing: ['#c4cddf', '#99afd9', '#6582ba', '#2a4b8d'],
    reading: ['#c8f0e7', '#77d8c2', '#00af89', '#03745c'],
    content: ['#fff1c6', '#f9df90', '#ffcc33', '#ddad1c']
};

const qualitativeScale = {
    "1": [ "#7F3C8D" ],
    "2": [ "#7F3C8D", "#11A579", "#A5AA99" ],
    "3": [ "#7F3C8D", "#11A579", "#3969AC", "#A5AA99" ],
    "4": [ "#7F3C8D", "#11A579", "#3969AC", "#F2B701", "#A5AA99" ],
    "5": [ "#7F3C8D", "#11A579", "#3969AC", "#F2B701", "#E73F74", "#A5AA99" ],
    "6": [ "#7F3C8D", "#11A579", "#3969AC", "#F2B701", "#E73F74", "#80BA5A", "#A5AA99" ],
    "7": [ "#7F3C8D", "#11A579", "#3969AC", "#F2B701", "#E73F74", "#80BA5A", "#E68310", "#A5AA99" ],
    "8": [ "#7F3C8D", "#11A579", "#3969AC", "#F2B701", "#E73F74", "#80BA5A", "#E68310", "#008695", "#A5AA99" ],
    "9": [ "#7F3C8D", "#11A579", "#3969AC", "#F2B701", "#E73F74", "#80BA5A", "#E68310", "#008695", "#CF1C90", "#A5AA99" ],
    "10": [ "#7F3C8D", "#11A579", "#3969AC", "#F2B701", "#E73F74", "#80BA5A", "#E68310", "#008695", "#CF1C90", "#f97b72", "#A5AA99" ],
    "11": [ "#7F3C8D", "#11A579", "#3969AC", "#F2B701", "#E73F74", "#80BA5A", "#E68310", "#008695", "#CF1C90", "#f97b72", "#4b4b8f", "#A5AA99" ]
};

const stableColorIndexes = {
    'Lightly Active': 0,
    'Active': 1,
    'Very Active': 2,
    'desktop': 0,
    'mobile-app': 1,
    'mobile-web': 2,
    'desktop-site': 0,
    'mobile-site': 1,
};

const lightColor = {
    contributing: colors.contributing[0],
    reading: colors.reading[0],
    content: colors.content[1]
};
const darkColor = {
    contributing: colors.contributing[3],
    reading: colors.reading[3],
    content: colors.content[3]
};


const areasWithMetrics = _.transform(questions, function (result, q) {
    let area = result.find((a) => a.name === q.a);
    if (!area) {
        area = {
            name: q.a,
            order: { contributing: 1, reading: 2, content: 3 }[q.a],
            color: colors[q.a][1],
            metrics: []
        };
        result.unshift(area);
    }

    area.metrics.push({
        name: _.kebabCase(q.m),
        fullName: q.m
    });

    result.sort((a, b) => a.order > b.order);
    return result;
}, []);

const mainMetricsByArea = [
    {
        state: {
            id: 'reading',
            name: 'Reading',
            metrics: [
                'total-pageviews',
                'unique-devices',
                'top-viewed-articles'
            ]
        }
    },
    {
        state: {
            id: 'contributing',
            name: 'Contributing',
            metrics: [
                'new-registered-users',
                'edits',
                'editors'
            ]
        }
    },
    {
        state: {
            id: 'content',
            name: 'Content',
            metrics: [
                'edited-pages',
                'net-bytes',
                'absolute-bytes'
            ]
        }
    }
];


const metrics = require('./metrics');

const questions = Object.keys(metrics).map(k => ({
    id: k,
    metric: metrics[k].fullName,
    area: metrics[k].area,
    question: metrics[k].question,
})).sort((a, b) => a.area > b.area || a.metric > b.metric);

const AQS_HOST = 'https://wikimedia.org/api/rest_v1/metrics';

export default {

    sitematrix: {
        endpoint: 'https://meta.wikimedia.org/w/api.php?action=sitematrix&formatversion=2&format=json&maxage=3600&smaxage=3600'
    },

    aqs: {
        'total-pageviews': {
            method: 'getAggregatedPageviews',
            endpoint: AQS_HOST + '/pageviews/aggregate/{{project}}/{{access}}/{{agent_type}}/{{granularity}}/{{start}}/{{end}}'
        },

        'unique-devices': {
            method: 'getUniqueDevices',
            endpoint: AQS_HOST + '/unique-devices/{{project}}/{{access-site}}/{{granularity}}/{{start}}/{{end}}'
        },

        'top-viewed-articles': {
            endpoint: AQS_HOST + '/pageviews/top/{{project}}/{{access}}/2015/10/all-days'
        },

        'new-pages': {
            endpoint: AQS_HOST + '/edited-pages/new/{{project}}/{{editor_type}}/{{page_type}}/{{granularity}}/{{start}}/{{end}}'
        },

        'new-registered-users': {
            endpoint: AQS_HOST + '/registered-users/new/{{project}}/{{granularity}}/{{start}}/{{end}}'
        },

        'editors': {
            endpoint: AQS_HOST + '/editors/aggregate/{{project}}/{{editor_type}}/{{page_type}}/{{activity_level}}/{{granularity}}/{{start}}/{{end}}'
        },

        'edits': {
            endpoint: AQS_HOST + '/edits/aggregate/{{project}}/{{editor_type}}/{{page_type}}/{{granularity}}/{{start}}/{{end}}'
        },

        'edited-pages': {
            endpoint: AQS_HOST + '/edited-pages/aggregate/{{project}}/{{editor_type}}/{{page_type}}/{{activity_level}}/{{granularity}}/{{start}}/{{end}}'
        },

        'net-bytes': {
            endpoint: AQS_HOST + '/bytes-difference/net/aggregate/{{project}}/{{editor_type}}/{{page_type}}/{{granularity}}/{{start}}/{{end}}'
        },

        'absolute-bytes': {
            endpoint: AQS_HOST + '/bytes-difference/absolute/aggregate/{{project}}/{{editor_type}}/{{page_type}}/{{granularity}}/{{start}}/{{end}}'
        }
    },

    // site config
    metricData (metricName) {
        return _.assign(
            metrics[metricName],
            { lightColor: lightColor[metrics[metricName].area] },
            { darkColor: darkColor[metrics[metricName].area] }
        );
    },

    getColorForBreakdown (breakdown, key) {
        return qualitativeScale[breakdown.values.length][breakdown.values.indexOf(breakdown.values.find(value => value.key === key))]
    },

    areas () {
        const areasFromMetrics = new Set();
        _.forEach(metrics, (metric) => {
            areasFromMetrics.add(metric.area);
        });
        const areaList = [
            { path: '', name: 'Dashboard' },
            { path: 'contributing', name: 'Contributing' },
            { path: 'reading', name: 'Reading' },
            { path: 'content', name: 'Content' },
        ].filter(
            (area) => area.path === '' || areasFromMetrics.has(area.path)
        );

        return areaList;
    },

    areaData () {
        return mainMetricsByArea;
    },

    metrics,
    colors,
    qualitativeScale,
    stableColorIndexes,
    questions,
    areasWithMetrics,
    months
};
