// window.$ = window.jQuery = require('jquery');
// helpers js
let sourcesDataFiltered;
let datatable;

// let regionsArr = ['All regions', 'AP', 'ESAR', 'EURO', 'LAC', 'MENA', 'WCAR'];
let regionsArr = ['All regions'];
let dimensionsArr = [];

function slugify(texte) {
    return texte.toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

// 
function generateRegionDropdown() {
    var options = "";
    for (let index = 0; index < regionsArr.length; index++) {
        const element = regionsArr[index];
        index == 0 ? options += '<option value="all" selected>' + element + '</option>' :
            options += '<option value="' + element + '">' + element + '</option>';
    }
    $('#regionSelect').append(options);
    $('#all').toggleClass('active');

} //generateRegionDropdown

function generateCountryDropdown() {
    let countries = [];
    countriesArr.forEach(iso => {
        const srce = geomData.features.filter((s) => { return s.properties.ISO_A3 == iso; });
        if (srce.length > 0) {
            countries.push({ country_code: iso, country: srce[0].properties.NAME });
        }
    });

    countries.sort(function(a, b) {
        var x = a.country.toLowerCase();
        var y = b.country.toLowerCase();
        if (x < y) { return -1; }
        if (x > y) { return 1; }
        return 0;
    });

    //create dropdown 
    let options = '';
    for (let index = 0; index < countries.length; index++) {
        options += '<option value="' + countries[index].country_code + '">' + countries[index].country + '</option>';
    }
    $("#countrySelect").append(options);

    $("#countrySelect").on("change", function(d) {
        const selected = $("#countrySelect").val();
        if (selected != "all") {
            g.filter('.hasStudy').each(function(element) { //mapsvg.select('g').selectAll('.hasStudy')
                if (element.properties.ISO_A3 == selected) {
                    mapOnClick(element.properties.NAME, selected);
                    $(this).attr('fill', hoverColor);
                    $(this).addClass('clicked');

                }
            });
            return;
        }
        resetMap();
    });
} //generateCountryDropdown

function generateDimensionFilterSpan() {
    var labels = "<label><strong>Filter by: <strong></label>";
    for (let index = 0; index < dimensionsArr.length; index++) {
        const item = dimensionsArr[index];
        labels += '<label><button type="button" class="btn btn-secondary filter" id="' + slugify(item) + '" value="' + item + '">' + item + '</button></label>';
    }
    $('.dimensionFilter').append(labels);
} //generateDimensionFilterSpan

function getColumnUniqueValues() {
    var values = [];
    for (let index = 0; index < arguments.length; index++) {
        var arr = [];
        values.push(arr);
    }
    sourcesData.forEach(element => {
        for (let index = 0; index < arguments.length; index++) {
            var arr = element[arguments[index]].split(",");
            var returnArr = values[index];
            var trimedArr = arr.map(x => x.trim());
            trimedArr.forEach(d => {
                returnArr.includes(d.trim()) ? '' : returnArr.push(d.trim());
            });
            values[index] = returnArr;
        }
    });

    return values;
} //getColumnUniqueValues


// map js
let countriesArr = [];
let isMobile = $(window).width() < 767 ? true : false;
let g, mapsvg, projection, width, height, zoom, path;
let viewportWidth = window.innerWidth;
let currentZoom = 1;
let mapClicked = false;
let selectedCountryFromMap = "all";
let countrySelectedFromMap = false;
let mapFillColor = '#204669', //'#C2DACA',//'#2F9C67', 
    mapInactive = '#fff', //'#DBDEE6',//'#f1f1ee',//'#C2C4C6',
    mapActive = '#2F9C67',
    hoverColor = '#2F9C67'; //'#78B794';
let countryIso3Code = 'ISO_A3',
    countryGeoName = 'NAME';


function initiateMap() {
    width = viewportWidth;
    height = 500;
    var mapScale = (isMobile) ? width / 3.5 : width / 10.6; //width/10.6;
    var mapCenter = (isMobile) ? [12, 12] : [25, 25]; //[25, 25];

    projection = d3.geoMercator()
        .center(mapCenter)
        .scale(mapScale)
        .translate([width / 1.5, height / 1.9]);

    path = d3.geoPath().projection(projection);

    zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", zoomed);


    mapsvg = d3.select('#map').append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", null);

    mapsvg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        // .attr("fill", "#99daea");
        .attr("fill", "#ccd4d8");

    //map tooltips
    var maptip = d3.select('#map').append('div').attr('class', 'd3-tip map-tip hidden');

    g = mapsvg.append("g").attr('id', 'countries')
        .selectAll("path")
        .data(geomData.features)
        .enter()
        .append("path")
        .attr('d', path)
        .attr('id', function(d) {
            return d.properties.ISO_A3;
        })
        .attr('class', function(d) {
            var className = (countriesArr.includes(d.properties.ISO_A3)) ? 'hasStudy' : 'inactive';
            return className;
        })
        .attr('fill', function(d) {
            return countriesArr.includes(d.properties.ISO_A3) ? mapFillColor : mapInactive;
        })
        .attr('stroke-width', .2)
        .attr('stroke', '#fff');

    mapsvg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);

    // choroplethMap();

    //zoom controls
    d3.select("#zoom_in").on("click", function() {
        zoom.scaleBy(mapsvg.transition().duration(500), 1.5);
    });
    d3.select("#zoom_out").on("click", function() {
        zoom.scaleBy(mapsvg.transition().duration(500), 0.5);
    });

    var tipPays = d3.select('#countries').selectAll('path')
    g.filter('.hasStudy')
        .on("mousemove", function(d) {
            if (!$(this).hasClass('clicked')) {
                $(this).attr('fill', hoverColor);
            }
            if (!mapClicked) {
                generateCountrytDetailPane(d.properties.ISO_A3, d.properties.NAME);
            }
            var mouse = d3.mouse(mapsvg.node()).map(function(d) { return parseInt(d); });
            maptip
                .classed('hidden', false)
                .attr('style', 'left:' + (mouse[0]) + 'px; top:' + (mouse[1] + 25) + 'px')
                .html(d.properties.NAME);

        })
        .on("mouseout", function(d) {
            if (!$(this).hasClass('clicked')) {
                $(this).attr('fill', mapFillColor);
            }
            if (!mapClicked) {
                generateDefaultDetailPane();
            }
            maptip.classed('hidden', true);
        })
        .on("click", function(d) {

            mapOnClick(d.properties.NAME, d.properties.ISO_A3);
            $(this).attr('fill', hoverColor);
            $(this).addClass('clicked');
            $('#countrySelect').val(d.properties.ISO_A3);
        })

} //initiateMap

function mapOnClick(country, iso) {
    mapClicked = true;
    selectedCountryFromMap = country;
    g.filter('.hasStudy').attr('fill', mapFillColor);
    // $(this).attr('fill', hoverColor);
    // $(this).addClass('clicked');
    var countryData = getDataTableDataFromMap(iso);
    updateDataTable(countryData);
    generateOverviewclicked(iso, country);
    $('.btn').removeClass('active');
    $('#all').toggleClass('active');
    $('#regionSelect').val('all');
} //mapOnClick

function showMapTooltip(d, maptip, text) {
    var mouse = d3.mouse(mapsvg.node()).map(function(d) { return parseInt(d); });
    maptip
        .classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 20) + 'px;top:' + (mouse[1] + 20) + 'px')
        .html(text)
}

function hideMapTooltip(maptip) {
    maptip.classed('hidden', true)
}

// zoom on buttons click
function zoomed() {
    const { transform } = d3.event;
    currentZoom = transform.k;

    if (!isNaN(transform.k)) {
        g.attr("transform", transform);
        g.attr("stroke-width", 1 / transform.k);

    }
}

function clicked(event, d) {
    var offsetX = 50; //(isMobile) ? 0 : 50;
    var offsetY = 25; //(isMobile) ? 0 : 25;
    const [
        [x0, y0],
        [x1, y1]
    ] = [
        [-20.75, -13.71],
        [31.5, 27.87]
    ]; //path.bounds(d);
    // d3.event.stopPropagation(event);
    mapsvg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.min(5, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2 + offsetX, -(y0 + y1) / 2 - offsetY),
        //   d3.mouse(mapsvg.node())
    );
}

// choropleth map
function choroplethMap() {
    mapsvg.selectAll('path').each(function(element, index) {
        d3.select(this).transition().duration(500).attr('fill', function(d) {
            // var filtered = filteredCfmData.filter(pt => pt['ISO3']== d.properties.ISO_A3);
            return '#fff'; //getRightCountryCFMColor(filtered);
        });
    });

}

function resetMap() {
    mapsvg.select('g').selectAll('.hasStudy').attr('fill', mapFillColor);
    generateDefaultDetailPane();
    mapClicked = false;
    selectedCountryFromMap = "all";
    $('#countrySelect').val('all');
}

// table js

// get dimensions formatted in tags
function getFormattedDimension(item) {
    var items = [];
    var arr = item.split(",");
    var trimedArr = arr.map(x => x.trim());
    for (let index = 0; index < trimedArr.length; index++) { //remove empty elements
        if (trimedArr[index]) {
            items.push(trimedArr[index]);
        }
    }
    var formatedDims = "";
    items.forEach(element => {
        var className = slugify(element);
        formatedDims += '<label class="alert tag-' + className + '">' + element + '</label>';
    });
    return formatedDims;
} //getFormattedDimension

function getDataTableData(data = sourcesDataFiltered) {
    var dt = [];
    data.forEach(element => {
        dt.push(
            [element['source_id'], element['title'],
                getFormattedDimension(element['dimension']),
                element['region'],
                element['source_date'],
                element['organisation'],
                '<a href="' + element['link'] + '" target="blank"><i class="fa fa-external-link"></i></a>',
                //hidden
                element['details'], element['authors'], element['countries'],
                element['variables'], element['source_comment'], element['methodology'],
                element['target_pop'], element['sample_type'], element['quality_check']
            ]);
    });
    return dt;
} //getDataTableData

// generate data table
function generateDataTable() {
    var dtData = getDataTableData();
    datatable = $('#datatable').DataTable({
        data: dtData,
        "columns": [{
                "className": 'details-control',
                "orderable": false,
                "data": null,
                "defaultContent": '<i class="fa fa-caret-down"></i>',
                "width": "1%"
            },
            { "width": "20%" },
            { "width": "20%" },
            { "width": "15%" },
            { "width": "5%" },
            { "width": "10%" },
            { "width": "1%" }
        ],
        "columnDefs": [{
                "className": "dt-head-left",
                "targets": "_all"
            },
            {
                "defaultContent": "-",
                "targets": "_all"
            },
            { "targets": [7], "visible": false }, { "targets": [8], "visible": false }, { "targets": [9], "visible": false },
            { "targets": [10], "visible": false }, { "targets": [11], "visible": false }, { "targets": [12], "visible": false },
            { "targets": [13], "visible": false }, { "targets": [14], "visible": false }, { "targets": [15], "visible": false },
            { "searchable": true, "targets": "_all" },
            { "type": "myDate", "targets": 4 }
        ],
        "pageLength": 20,
        "bLengthChange": false,
        "pagingType": "simple_numbers",
        "order": [
            [0, 'asc']
        ],
        "dom": "Blrtp",
        "buttons": {
            "buttons": [{
                extend: 'excelHtml5',
                "className": "exportData",
                exportOptions: {
                    // columns: ':visible',
                    rows: ':visible',
                    format: {
                        header: function(data, columnIdx) {
                            var hd = ['details', 'authors', 'countries', 'variables', 'source_comment', 'methodology', 'target_pop', 'sample_type', 'quality_check'];
                            if (columnIdx >= 7) {
                                return hd[columnIdx - 7];
                            } else {
                                return data;
                            }
                        }
                    }
                }
            }]
        }
    });

    $('#datatable tbody').on('click', 'td.details-control', function() {
        var tr = $(this).closest('tr');
        var row = datatable.row(tr);
        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass('shown');
            tr.css('background-color', '#fff');
            tr.find('td.details-control i').removeClass('fa fa-caret-right');
            tr.find('td.details-control i').addClass('fa fa-caret-down');
        } else {
            row.child(format(row.data())).show();
            tr.addClass('shown');
            tr.css('background-color', '#f5f5f5');
            $('#cfmDetails').parent('td').css('border-top', 0);
            $('#cfmDetails').parent('td').css('padding', 0);
            $('#cfmDetails').parent('td').css('background-color', '#f5f5f5');
            tr.find('td.details-control i').removeClass('fa-solid fa-caret-down');
            tr.find('td.details-control i').addClass('fa-solid fa-caret-right');

        }
    });
} //generateDataTable

function format(arr) {
    filtered = sourcesData.filter(function(d) { return d['source_id'] == arr[0]; });
    return '<table class="tabDetail" id="cfmDetails" >' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>&nbsp;</td>' +
        '<td>&nbsp;</td>' + '<td>&nbsp;</td>' +
        '<td>' +
        '<table class="tabDetail" >' +
        '<tr>' +
        '<th><strong>Geo</strong></th>' +
        '<td>Region</td>' +
        '<td>' + filtered[0]['region'] + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>Countries (' + filtered[0]['country_count'] + ')</td>' +
        '<td>' + filtered[0]['countries'] + '</td>' +
        '</tr>' +

        '<tr>' +
        '<th><strong>Purpose</strong></th>' +
        '<td>Summary</td>' +
        '<td>' + filtered[0]['details'] + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>Indicators</td>' +
        '<td>' + filtered[0]['variables'] + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>Target</td>' +
        '<td>' + filtered[0]['target_pop'] + '</td>' +
        '</tr>' +
        '<tr>' +
        '<th><strong>Method</strong></th>' +
        '<td>Survey</td>' +
        '<td>' + filtered[0]['methodology'] + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>Sample</td>' +
        '<td>' + filtered[0]['sample_type'] + ' - ' + filtered[0]['sample_size'] + ' respondents</td>' +
        '</tr>' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>Review</td>' +
        '<td>' + filtered[0]['quality_check'] + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>Comment</td>' +
        '<td>' + filtered[0]['source_comment'] + '</td>' +
        '</tr>' +
        '<tr>' +
        // '<th rowspan="3"><strong>Source</strong></th>'+
        '<th><strong>Source</strong></th>' +
        '<td>Data Type</td>' +
        '<td>' + filtered[0]['access_type'] + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>Authors</td>' +
        '<td>' + filtered[0]['authors'] + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>&nbsp;</td>' +
        '<td>Publication</td>' +
        // '<td><a href="'+filtered[0]['link']+'" target="blank"><i class="fa fa-download fa-sm"></i></a></td>'+
        '<td>' + filtered[0]['publication_channel'] + '</td>' +
        '</tr>' +
        '</table>' +
        '</td>' +
        '<td>&nbsp;</td>' +
        '</tr>' +
        '</table>'
} //format

function updateDataTable(data = sourcesData) {
    var dt = getDataTableData(data);
    $('#datatable').dataTable().fnClearTable();
    $('#datatable').dataTable().fnAddData(dt);

} //updateDataTable

// search button
$('#searchInput').keyup(function() {
    datatable.search($('#searchInput').val()).draw();
});

var buttocks = document.getElementsByClassName("filter");
for (var i = 0; i < buttocks.length; i++) {
    buttocks[i].addEventListener('click', clickButton);
}

function clickButton() {
    $('.btn').removeClass('active');
    var dimSelected = this.value;
    var regionSelected = $('#regionSelect').val();
    var data = sourcesData;


    if (mapClicked) {
        data = data.filter(function(item) {
            var arr = item['countries'].split(",");
            var trimedArr = arr.map(x => x.trim());
            return trimedArr.includes(selectedCountryFromMap) ? item : null;
        })
    }

    if (dimSelected == "all") {
        //test map clicked ? 
        mapClicked ? resetMap() : null;
        updateDataTable(data);
        $('#regionSelect').val('all');
        // mapClicked = false;
        generateDefaultDetailPane();

    } else {
        var filteredData = data.filter(function(d) {
            var arr = d['dimension'].split(",");
            var regArr = d['region'].split(",");
            var trimedTagArr = arr.map(x => x.trim());
            var trimedRegArr = regArr.map(x => x.trim());
            regionSelected == 'all' ? trimedRegArr = "all" : null;
            return (trimedTagArr.includes(dimSelected) && trimedRegArr.includes(regionSelected)) ? d : null;
        })
        updateDataTable(filteredData);
        // update panel charts
        mapClicked ? null : generateDetailPaneFromDim(filteredData, dimSelected);
    }

    $(this).toggleClass('active');

} //clickButton

// on select dropdown change
$('#regionSelect').on('change', function() {
    var tagsFilter = 'all';
    var data = sourcesData;

    if (!($('#all').hasClass('active'))) {
        for (var i = 0; i < buttocks.length; i++) {
            if ($(buttocks[i]).hasClass('active')) {
                tagsFilter = $(buttocks[i]).val();
            }

        }
    }
    var regionSelected = $('#regionSelect').val();
    mapClicked ? resetMap() : null;

    if (regionSelected == "all") {
        tagsFilter == 'all' ? updateDataTable() : $('.active').trigger('click');
        // reset panel 
        resetMap();
    } else {
        var filter = data.filter(function(d) {
            var arr = d['dimension'].split(",");
            var regArr = d['region'].split(",");
            var trimedTagArr = arr.map(x => x.trim());
            var trimedRegArr = regArr.map(x => x.trim());
            tagsFilter == 'all' ? trimedTagArr = "all" : null; //this for the condition to be always true
            return (trimedRegArr.includes(regionSelected) && trimedTagArr.includes(tagsFilter)) ? d : null;
        });
        updateDataTable(filter);
        generatePaneFromRegion(filter, regionSelected);
    }
    // $('#'+tagsFilter).toggleClass('active');
});

$("#exportTable").on("click", function() {
    // datatable.button( '.buttons-excel' ).trigger();
    $(".buttons-excel").trigger("click");
});

function getDataTableDataFromMap(country) {
    var dataByCountry = sourcesDataFiltered.filter(function(p) {
        var countries = p['iso3'].split(",");
        var trimedCountriesArr = countries.map(x => x.trim());
        return trimedCountriesArr.includes(country);
    });

    // reinitiate dim et region select filters to default
    return dataByCountry;
} //getDataTableDataFromMap

function getFilteredData() {
    console.log("get filtered data running..")
    var data = [];

    return data;

} //getFilteredData
let lastCountryCharted = '';
let dimensionChart,
    countryData_,
    xAxisArr = ['x'],
    yAxisArr = ['dimension'],
    collections = {};

function generateDefaultDetailPane() {
    $('.details > h6').text('global overview');
    $('#globalStats').html('');
    $('#globalStats')
        .append(
            '<div class="row">' +
            '<div class="col-md-6 key-figure">' +
            '<div class="num" id="totalSources">' + sourcesData.length + '</div>' +
            '<h5>QUANTITATIVE studies</h5>' +
            '</div>' +
            '<div class="col-md-6 key-figure">' +
            '<div class="num" id="date">' + countriesArr.length + '</div>' +
            '<h5># countries and territories</h5>' +
            '</div>' +
            '</div>'

        );
    $('#overview').addClass('hidden');
    $('#globalStats').removeClass('hidden');
} // generateDefaultDetailPane

function generateDetailPaneFromDim(data, dimension) {
    var countriesDim = [];
    data.forEach(element => {
        var arr = element['iso3'].split(",");
        var trimedArr = arr.map(x => x.trim());
        trimedArr.forEach(d => {
            countriesDim.includes(d.trim()) ? '' : countriesDim.push(d.trim());
        });
    });
    $('.details > h6').text(dimension + ' dimension overview');
    $('#globalStats').html('');
    $('#globalStats')
        .append(
            '<div class="row">' +
            '<div class="col-md-6 key-figure">' +
            '<div class="num" id="totalSources">' + data.length + '</div>' +
            '<h5>QUANTITATIVE studies</h5>' +
            '</div>' +
            '<div class="col-md-6 key-figure">' +
            '<div class="num" id="date">' + countriesDim.length + '</div>' +
            '<h5># countries and territories</h5>' +
            '</div>' +
            '</div>'

        );
    $('#overview').addClass('hidden');
    $('#globalStats').removeClass('hidden');
} //generateDetailPane

function generatePaneFromRegion(data, region) {
    countryData_ = data;
    for (let index = 0; index < dimensionsArr.length; index++) {
        const element = dimensionsArr[index];
        collections[element] = { "value": 0 };
        xAxisArr.push(element);
    }
    countryData_.forEach(element => {
        var dims = element['dimension'].split(",");
        var trimedDimsArr = dims.map(x => x.trim());
        trimedDimsArr.forEach(d => {
            collections[d.trim()].value += 1;
        });
    });
    var totalDim = 0;
    for (k in collections) {
        totalDim += collections[k].value;
    }
    for (let index = 1; index < xAxisArr.length; index++) {
        const element = xAxisArr[index];
        yAxisArr[index] = collections[element].value;
    }
    drawPanelChart(region);
} //generatePaneFromRegion 

function generateCountrytDetailPane(country, name) {
    if (lastCountryCharted != name) {
        countryData_ = getDataTableDataFromMap(country);
        lastCountryCharted = name;
        for (let index = 0; index < dimensionsArr.length; index++) {
            const element = dimensionsArr[index];
            collections[element] = { "value": 0 };
            xAxisArr.push(element);
        }
        countryData_.forEach(element => {
            var dims = element['dimension'].split(",");
            var trimedDimsArr = dims.map(x => x.trim());
            trimedDimsArr.forEach(d => {
                // d.trim() != "" ? collections[d.trim()].value +=1 : null;
                collections[d.trim()].value += 1;
            });
        });
        var totalDim = 0;
        for (k in collections) {
            totalDim += collections[k].value;
        }
        for (let index = 1; index < xAxisArr.length; index++) {
            const element = xAxisArr[index];
            yAxisArr[index] = collections[element].value;
        }

    }

    drawPanelChart(name);
} // generateCountrytDetailPane

function generateOverviewclicked(country, name) {
    $('.details > h6').text('global overview');
    generateCountrytDetailPane(country, name);
}

function drawPanelChart(name) {
    $('.details > h6').text(name + ' overview');
    $('#overview').html('');
    $('#overview')
        .append(
            '<div class="row">' +
            '<div class="col-md-12 key-figure">' +
            '<span class="num" id="totalSources">' + countryData_.length + '</span>' +
            '<span id="sourceLabel"> QUANTITATIVE studies</span>' +
            '</div>' +
            '</div>' +
            '<div class="row">' +
            '<div class="col-md-12">' +
            '<div id="dimChart">' +
            '</div>' +
            '</div>'
        );

    var chart = c3.generate({
        bindto: '#dimChart',
        size: { height: 200 },
        data: {
            x: 'x',
            columns: [xAxisArr, yAxisArr],
            type: 'bar'
        },
        bar: {
            width: 25
        },
        color: {
            pattern: ['#78B794', '#546B89']
        },
        axis: {
            x: {
                type: 'category',
                // height: 100,
                tick: {
                    outer: false,
                    fit: true,
                    rotate: -35,
                    multiline: false
                }
            },
            y: {
                // show: false,
                tick: {
                    outer: false,
                    format: d3.format('d'),
                    count: 3
                }
            }
        },
        legend: {
            show: false
        },
        tooltip: {
            show: false
        }
    });
    $('#globalStats').addClass('hidden');
    $('#overview').removeClass('hidden');
} //drawPanelChart
let geodataUrl = 'data/wld052022.json';
let data_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQwVG8xzJogJgeBzk5-mLaA7BOGWhwU_Z6iGrnGQwPT2OAInzFYX-5hNYh2aFyqn0sVh0PpFikSJuEq/pub?gid=1612863274&single=true&output=csv';
// 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQDTIju76FYADX9ZKbKBD1JBA7eFLv86Y8ltOTs24eLqrf3FnKJENmtcUkP1HUMCQq7JL9hgwofz0q/pub?gid=1612863274&single=true&output=csv';

let geomData,
    sourcesData;

$(document).ready(function() {
    function getData() {
        Promise.all([
            d3.json(geodataUrl),
            d3.csv(data_url),
        ]).then(function(data) {
            geomData = topojson.feature(data[0], data[0].objects.geom);
            sourcesData = data[1];

            sourcesDataFiltered = data[1];
            var arrs = getColumnUniqueValues("iso3", "dimension", "region");
            countriesArr = arrs[0],
                dimensionsArr = arrs[1],
                regionsArr.push(...arrs[2]);
            generateCountryDropdown();
            generateRegionDropdown();
            // init map global stats
            initiateMap();
            generateDataTable();
            generateDefaultDetailPane();
            //remove loader and show vis
            $('.loader').hide();
            $('#main').css('opacity', 1);
        }); // then
    } // getData

    getData();
});