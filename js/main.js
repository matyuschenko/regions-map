// цвета для окраски точек в зависимости от их класса
var colors = {
    'europe': '#7fc97f',
    'siberia': '#fdc086'
};

// словарь для перевода типа объекта в данных в семантичный вид: страна, федеральный округ, субъект
var levels = {
    2: 'country',
    3: 'district',
    4: 'region'
};

// размеры картинки
var w = 900,
    h = 500;

// добавляем svg
var svg = d3.select('.content').append('svg')
    .attr('width', w)
    .attr('height', h)
    .append('g');
var regions_map = svg.append('g');

// задаём проекцию
var projection = d3.geoAlbers()
    .rotate([-105, 0])
    .center([-10, 65])
    .parallels([52, 64])
    .scale(650)
    .translate([w / 2, h / 2]);

var path = d3.geoPath()
    .projection(projection);

// загружаем данные о границах, рисуем карту
d3.json('data/regions-ru_q0_coast.json', function(data) {

    // добавляем границы
    regions_map.selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class', function(d) { return levels[d.properties.level] }) // указываем класс: страна/округ/регион
        .attr('orderIndex', function(d) { return d.properties.orderIndex; })
        .append('title').text(function(d) { return d.properties.name; });

});

// создаём тултип, он пока не виден
var tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("opacity", 0);

// создаём инфоокно, оно пока не видно
var infopane = d3.select("body").append("div")
    .attr("id", "infopane")
    .style("opacity", 0);

// функция для отрисовки городов
(function drawCities() {
    // загружаем данные
    d3.tsv("data/cities.txt", function(data) {
        data.forEach(function(d) {
            // для каждой точки считаем базовую величину для определения радиуса
            d.rad = Math.sqrt(d.size / Math.PI);
        });

        // добавляем группы, в которых будут лежать круги и подписи
        var city = svg.selectAll("g.city")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "city")
            .attr("transform", function(d) { return "translate(" + projection([d.lon, d.lat]) + ")"; });

        var citySize = d3.scaleLinear()
            .domain(d3.extent(data, function(d) { return d.rad; }))
            .range([2, 10]);

        // добавляем круги
        city.append("circle")
            .attr('class', 'city__circle')
            .attr("r", function(d) { return citySize(d.rad); })
            .style("fill", function(d) { return colors[d.color_group]; });

        // добавляем подписи
        city.append("text")
            .attr('class', 'city__name')
            .attr("x", function(d) { return citySize(d.rad) + 2;})
            .text(function(d) { return d.city; });

        // добавляем поведения по ховеру — появляется тултип
        city
            .on("mouseover", function(d) {
                tooltip.transition().delay(100).duration(300)
                    .style("opacity", 1);
                tooltip.text(d.size + ' тыс. человек')
                    .style("left", (d3.event.pageX < w/2 ? d3.event.pageX : d3.event.pageX - $('#tooltip').width()) + "px")
                    .style("top", (d3.event.pageY - 35) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition().delay(100).duration(300)
                    .style("opacity", 0);
            });

        // добавляем поведения по клику — появляется инфоокно
        city
            .on("click", function(d) {
                infopane.html('<b>' + d.city + '</b><br>Города-миллионеры — категория городов на территории Российской Федерации, численность населения в пределах городской черты которых превышает 1 млн человек.').transition().delay(100).duration(300)
                    .style("opacity", 1);
                if (d3.event.pageX < w/2) {
                    infopane.style('left', '').style('right', '105px')
                } else {
                    infopane.style('left', '15px')
                }
            });

        // по клику на карту прячем инфоокно
        regions_map
            .on("click", function() {
                infopane.transition().delay(100).duration(300)
                    .style("opacity", 0);
            });

        // рисуем легенду
        (function addLegend() {
            var legend = $('<div>').attr({
                'id': 'legend'
            }).appendTo('body');

            legend.html('<svg width="120px" height="25px"><circle class="legend__circle" cx="12" cy="12" style="fill: rgb(127, 201, 127);" default_r="10" r="10"></circle><text y="17" x="32">12 млн. человек</text></svg>');
        })();

        // добавляем зум
        var zoom = d3.zoom()
            .scaleExtent([1, 10])
            .on("zoom", zoomed);

        function zoomed() {
            var transform = d3.zoomTransform(this);
            svg.attr("transform", "translate(" + transform.x + "," + transform.y + ")scale(" + transform.k + ")");
            $('.region').css('stroke-width', 1/transform.k + 'px');
            svg.selectAll("g.city").selectAll('.city__circle').attr('r', function(d) { return citySize(d.rad)/transform.k; });
            svg.selectAll("g.city").selectAll('.city__name')
                .attr("x", function(d) { return citySize(d.rad)/transform.k + 2;})
                .style('font-size', function() { return 10/transform.k+'px'; });
            d3.select('.current-zoom').text(transform.k);
        }

        d3.select('svg')
            .call(zoom);

    });
})();