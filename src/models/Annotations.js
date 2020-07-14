import _ from '../lodash-custom-bundle';
import utils from '../utils';


/**
 * relevantBreakdowns have the form [{dimension, [values, ... ]}, ... ]
 * so this function generates annotations for any and all nested relevant breakdown values
 */
function expandByBreakdown (result, a) {
    if (a.relevantBreakdowns) {
        a.relevantBreakdowns.forEach(ab => {
            ab.values.forEach(abv => {
                const clone = utils.cloneDeep(a);
                clone.date = a.date;
                clone.breakdown = ab.dimension;
                clone.splitValue = abv;

                result.push(clone);
            });
        });
    } else {
        a.breakdown = 'total';
        a.splitValue = 'total';
        result.push(a);
    }

    return result;
}


function setValues (annotations, graphData) {
    let closestIndex = 0;
    let aIndex = 0;

    while (closestIndex < graphData.length) {
        while (aIndex < annotations.length &&
               annotations[aIndex].date <= graphData[closestIndex].month) {
            const a = annotations[aIndex]
            annotations[aIndex].value = graphData[closestIndex].total[a.splitValue];
            annotations[aIndex].date = graphData[closestIndex].month;
            aIndex++;
        }
        closestIndex++;
    }
}


function processRawAnnotations (annotations, graphModel) {
    const splittingDimension = graphModel.dimensions && graphModel.dimensions.find(d => d.splitting);
    const start = graphModel.graphData[0].month;
    const end = graphModel.graphData[graphModel.graphData.length - 1].month;
    const key = splittingDimension ? splittingDimension.key : 'total';
    const splitValues = splittingDimension ? splittingDimension.values.filter(bv => bv.on) : [];

    const filteredAndExpanded = annotations
        .filter(a => !_.isEmpty(a.note) && a.date !== null)
        .filter(a => a.date >= start && a.date <= end)
        .reduce(expandByBreakdown, [])
        .filter(a => key === 'total' || key === a.breakdown && splitValues.find(bv => bv.key === a.splitValue));

    setValues(filteredAndExpanded, graphModel.graphData);

    return filteredAndExpanded;
}


/* Annotations overlap if their dates are too close to draw markers,
 * so x(a.data.date) - x(b.data.date) < spacePerAnnotation
 *
 * This function assumes that the annotations passed in are not a general list,
 * but filtered down to only one active breakdown.  It then groups the
 * annotations separately per breakdown value if they overlap.  It finally flattens
 * and returns the list.  When annotations are grouped, their title indicates
 * the grouping and their label is merged.
 *
 * NOTE: one limitation of the current approach is that when two breakdowns have
 * annotations on points that are overlapping, it will not group them.
 */
function groupIfOverlapping (annotations, spacePerAnnotation) {
    const groupedByBreakdown = annotations.reduce((result, a) => {
        if (!result[a.splitValue]) {
            result[a.splitValue] = [];
        }

        const lastIndex = result[a.splitValue].length - 1;
        let append = true;

        if (lastIndex >= 0) {
            const lastNote = result[a.splitValue][lastIndex];
            if (a.x - lastNote.x < spacePerAnnotation) {
                append = false;
                lastNote.note.label += ` *** ${a.note.title}: ${a.note.label}`;
                lastNote.groupSize ++;
            }
        }

        if (append) {
            a.groupSize = 1;
            result[a.splitValue].push(a);
        }

        return result;
    }, {});

    var output = _.flatten(Object.keys(groupedByBreakdown).map(b => {
        const groupList = groupedByBreakdown[b];
        groupList.forEach(g => {
            if (g.groupSize > 1) {
                g.note.title += ` (+${g.groupSize} others)`;
            }
        });
        return groupList;
    }));
    return output;
}


/**
 * A set of functions that transforms annotations so they can be rendered on a graph
 */
export {
    processRawAnnotations,
    groupIfOverlapping,
};
