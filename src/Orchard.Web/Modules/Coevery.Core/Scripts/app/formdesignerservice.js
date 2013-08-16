﻿define([], function () {
    //Place Indicator Helper
    function PlaceIndicator() {
        this.columnIndex = null;
        this.isAbove = null;
        this.markedRow = null;
        this.indicator = $('<div style="position:absolute;border-top:3px solid red;"></div>');
    }
    PlaceIndicator.prototype.hide = function () {
        this.indicator.hide();
    };
    PlaceIndicator.prototype.show = function (row, columnIndex, isAbove) {
        var direction = isAbove ? 'top' : 'bottom',
            $row = $(row),
            widths = getColumnWidths($row.parents('[fd-section]:first').attr('section-columns-width')),
            left = 0, leftPosition, width;

        for (var i = 0; i < columnIndex; i++) {
            left += widths[i];
        }
        leftPosition = left / 12 * 100 + '%',
        width = widths[columnIndex] / 12 * 100 + '%';

        this.indicator.css('left', leftPosition);
        this.indicator.width(width);
        this.indicator.css('top', '');
        this.indicator.css('bottom', '');
        this.indicator.css(direction, -8);
        this.indicator.show();
        $row.append(this.indicator);

        this.columnIndex = columnIndex;
        this.isAbove = isAbove;
        this.markedRow = $row;
    };

    var placeIndicator = new PlaceIndicator();
    var inLayoutFields = [];

    function getColumnWidths(widthStr) {
        return $.map(widthStr.split(':'), function (n) {
            return parseInt(n);
        });
    }

    function adjustColumnsPosition(movedColumn, $compile, $scope) {
        var movedRow = movedColumn.parent(),
            columnIndex, rows, columns, lastRow,
            columnsCount, fields, row;

        if (movedRow.hasClass('merged-row')) {
            rows = $($.merge($.makeArray(movedRow.prevUntil('.merged-row')).reverse(), movedRow.nextUntil('.merged-row')));
            columnsCount = parseInt(movedRow.parents('[fd-section]').attr('section-columns'));
            for (var j = 1; j <= columnsCount; j++) {
                columns = rows.children('[fd-column]:nth-child(' + j + ')');
                fields = columns.children('[fd-field]');
                for (var k = 0; k < fields.length; k++) {
                    $(columns[k]).append(fields[k]);
                }
            }
            if (rows.length) {
                for (var l = rows.length - 1; l > 0; l--) {
                    row = $(rows[l]);
                    if (row.find('[fd-field]').length) {
                        break;
                    } else {
                        row.remove();
                    }
                }
            } else {
                row = createNewRow(columnsCount);
                movedRow.after(row);
                $compile(row)($scope);
            }
            movedRow.remove();
        } else {
            rows = movedRow.nextUntil('.merged-row').andSelf();
            columnIndex = movedRow.children().index(movedColumn);
            columns = rows.find('[fd-column]:nth-child(' + (columnIndex + 1) + ')');
            for (var i = 0; i < columns.length - 1; i++) {
                $(columns[i]).append($(columns[i + 1]).children());
            }
            lastRow = rows.last();
            if (lastRow.siblings().length && !lastRow.find('[fd-field]').length) {
                lastRow.remove();
            }
        }
    }

    function newGuid() {
        var guid = "";
        for (var i = 1; i <= 32; i++) {
            var n = Math.floor(Math.random() * 16.0).toString(16);
            guid += n;
            if ((i == 8) || (i == 12) || (i == 16) || (i == 20))
                guid += "-";
        }
        return guid;
    }

    function removeSpanClass(item) {
        var itemElem = $(item);
        var classStr = itemElem.attr('class');
        itemElem.attr('class', classStr.replace(/span\d+/g, ''));
    }

    function getHelper() {
        var helper = $('<div class="" style="border:1px solid #ccc;"></div>'),
            item = $(this),
            padding = item.is('[fd-field]') ? '10px' : '0 10px 20px 10px';

        helper.height(item.height());
        helper.width(item.width());
        helper.append(item.html());
        helper.css('background-color', 'white');
        helper.find('.tools').remove();
        helper.css('padding', padding);
        return helper;
    }

    function clearMark(item) {
        var itemElem = $(item);
        itemElem.removeClass('markedAbove marked');
    }

    function setMark(item, above) {
        var itemElem = $(item);
        if (above) {
            itemElem.removeClass('marked');
            itemElem.addClass('markedAbove');
        } else {
            itemElem.removeClass('markedAbove');
            itemElem.addClass('marked');
        }
    }

    function createNewRow(columnCount) {
        var columnsString = '';
        for (var i = 0; i < columnCount; i++) {
            columnsString += '<fd-column></fd-column>';
        }
        return $('<fd-row>' + columnsString + '</fd-row>');
    }

    angular.module('coevery.formdesigner', ['ngResource'])
        .directive('fdToolsSection', function () {
            return {
                template: '<p fd-tools-section fd-draggable class="alert alert-info"><span class="title" ng-transclude></span></p>',
                replace: true,
                restrict: 'E',
                transclude: true,
                link: function (scope, element, attrs) {
                }
            };
        })
        .directive('fdToolsField', function ($rootScope) {
            //$rootScope.inLayoutFields || ($rootScope.inLayoutFields = []);
            $rootScope.$watch(function (scope) {
                //return scope.inLayoutFields.join(',');
                return inLayoutFields.join(',');
            }, function (newValue, oldValue) {
                var currentFields = newValue ? newValue.split(',') : [],
                    oldFields = oldValue ? oldValue.split(',') : [],
                    differentFields;

                if (newValue == oldValue) {
                    setFieldsUsed(currentFields);
                    return;
                }
                if (currentFields.length > oldFields.length) {
                    differentFields = getDifferentItems(currentFields, oldFields);
                    setFieldsUsed(differentFields);
                } else {
                    differentFields = getDifferentItems(oldFields, currentFields);
                    setFieldsUnused(differentFields);
                }

                function setFieldsUsed(fields) {
                    for (var i = 0; i < fields.length; i++) {
                        var fieldItem = $('[fd-tools-field][field-name=' + fields[i] + ']');
                        fieldItem.hide();
                    }
                }

                function setFieldsUnused(fields) {
                    for (var i = 0; i < fields.length; i++) {
                        var fieldItem = $('[fd-tools-field][field-name=' + fields[i] + ']');
                        fieldItem.show();
                    }
                }

                function getDifferentItems(items, source) {
                    var differentItems = [];
                    for (var i = 0; i < items.length; i++) {
                        $.inArray(items[i], source) == -1 && differentItems.push(items[i]);
                    }
                    return differentItems;
                }
            });

            return {
                template: '<p fd-tools-field fd-draggable class="alert alert-info"><span class="title"></span></p>',
                replace: true,
                restrict: 'E',
                controller: function () {
                    console.log('controller!!');
                },
                link: function (scope, element, attrs) {
                    var titleElem = element.children();
                    titleElem.text(attrs.fieldDisplayName);
                }
            };
        })
        .directive('fdForm', function ($compile, $rootScope) {
            return {
                template: '<div fd-form class="row-fluid"><section class="span12 edit-mode"><form class="form-horizontal" ng-transclude></form></section></div>',
                replace: true,
                restrict: 'E',
                transclude: true,
                controller: function() {
                    inLayoutFields = [];
                    //scope.$on('$viewContentLoaded', function () {
                    //    console.log('loaded');
                    //    inLayoutFields = [];
                    //});
                },
                link: function (scope, element, attrs) {
                    var lastMarked = null;
                    element.find('form:first').droppable({
                        accept: '[fd-section], [fd-tools-section]',
                        tolerance: "pointer",
                        drop: function (event, ui) {
                            $rootScope.dragHandler = null;
                            var markedSection = $(this).find('.marked, .markedAbove').filter('[fd-section]'),
                                dragItem;

                            if (ui.draggable.is('[fd-tools-section]')) {
                                dragItem = $('<fd-section></fd-section>');
                                copySectionProperties(ui.draggable, dragItem);
                                $compile(dragItem)(scope);
                            } else {
                                dragItem = ui.draggable;
                            }

                            if (markedSection.attr('id') == dragItem.attr('id')) {
                                clearMark(lastMarked);
                                return;
                            }
                            if (!markedSection.length) {
                                $(this).append(dragItem);
                                clearMark(lastMarked);
                                return;
                            }
                            markedSection.is('.marked')
                                ? markedSection.after(dragItem)
                                : markedSection.before(dragItem);

                            clearMark(lastMarked);
                        },
                        over: function (event, ui) {
                            $rootScope.dragHandler = function (dragEvent, dragUi) {
                                markSection({
                                    x: dragEvent.pageX,
                                    y: dragEvent.pageY
                                });
                            };
                            $rootScope.dragHandler(event, ui);
                        },
                        out: function (event, ui) {
                            $rootScope.dragHandler = null;
                            clearMark(lastMarked);
                        }
                    });

                    function copySectionProperties(from, to) {
                        to.attr('section-columns', from.attr('section-columns'));
                        to.attr('section-columns-width', from.attr('section-columns-width'));
                        to.attr('section-title', 'Sample Title');
                    }

                    function markSection(position) {
                        var sections = element.find('[fd-section]');
                        if (!sections.length) {
                            lastMarked = element;
                            setMark(lastMarked, true);
                            return;
                        }

                        for (var i = 0; i < sections.length; i++) {
                            var section = $(sections[i]),
                                sectionOffsetY = section.offset().top,
                                sectionHeight = section.height(),
                                result = position.y >= sectionOffsetY && position.y < sectionOffsetY + sectionHeight
                                    ? (position.y < sectionOffsetY + sectionHeight / 2 ? true : false)
                                    : null;

                            if (result != null) {
                                clearMark(lastMarked);
                                var above = result && i == 0;
                                var index = result ? i - 1 : i;
                                lastMarked = above ? sections[0] : sections[index];
                                setMark(lastMarked, above);
                                break;
                            }
                        }
                    }
                }
            };
        })
        .directive('fdSection', function ($compile, $rootScope) {
            return {
                template: '<fieldset fd-draggable drag-handle="legend" fd-section><legend fd-hoverable class="clearfix"><div class="span12 title"></div><div class="tools"><fd-tool-property></fd-tool-property><fd-tool-remove></fd-tool-remove></div></legend><div fd-field-container ng-transclude></div></fieldset>',
                replace: true,
                restrict: 'E',
                transclude: true,
                link: function (scope, element, attrs) {
                    var id = newGuid(),
                        sectionHeader = element.find('legend:first'),
                        watchList = [],
                        watch;

                    attrs.$set('id', id);
                    sectionHeader.find('.tools:first').hide();
                    sectionHeader.find('.title:first').text(attrs.sectionTitle);
                    sectionHeader.dblclick(openPropertyDialog);

                    watch = $rootScope.$watch(function () {
                        return element.attr('section-title');
                    }, function (newValue) {
                        sectionHeader.find('.title:first').text(newValue);
                    });
                    watchList.push(watch);
                    watch = $rootScope.$watch(function () {
                        return element.attr('section-columns');
                    }, changeColumnCountHandler);
                    watchList.push(watch);
                    watch = $rootScope.$watch(function () {
                        return element.attr('section-columns-width');
                    }, function (newValue) {
                        var columnsCount = parseInt(element.attr('section-columns'));
                        if (columnsCount < 2) {
                            return;
                        }
                        var widths = getColumnWidths(newValue),
                            rows = element.find('[fd-row]:not(.merged-row)'),
                            columns, width;

                        for (var i = 0; i < columnsCount; i++) {
                            columns = rows.children('[fd-column]:nth-child(' + (i + 1) + ')');
                            width = widths[i];
                            columns.each(function () {
                                removeSpanClass(this);
                                $(this).addClass('span' + width);
                            });
                        }
                    });
                    watchList.push(watch);

                    sectionHeader[0].hoverOverHandler = function () {
                        $(this).find('.tools:first').show();
                    };
                    sectionHeader[0].hoverOutHandler = function () {
                        $(this).find('.tools:first').hide();
                    };
                    sectionHeader.find('.tools:first')[0].toolProperty = openPropertyDialog;
                    sectionHeader.find('.tools:first')[0].toolRemove = removeSection;

                    if (!element.find('[fd-row]').length) {
                        var columnCount = parseInt(attrs.sectionColumns);
                        var emptyRow = createNewRow(columnCount);
                        element.find('[fd-field-container]:first').append(emptyRow);
                        $compile(emptyRow)(scope);
                    }

                    function changeColumnCountHandler(newValue, oldValue) {
                        if (newValue == oldValue) {
                            return;
                        }
                        var section = element,
                            newColumnCount = parseInt(newValue),
                            oldColumnCount = parseInt(oldValue),
                            rows = section.find('[fd-row]'),
                            widths = getColumnWidths(section.attr('section-columns-width')),
                            columns, width;

                        if (newColumnCount > oldColumnCount) {
                            var addCount = newColumnCount - oldColumnCount;
                            rows = rows.filter(':not(.merged-row)');
                            for (var i = 0; i < oldColumnCount; i++) {
                                columns = rows.children('[fd-column]:nth-child(' + (i + 1) + ')');
                                width = widths[i];
                                columns.each(function () {
                                    removeSpanClass(this);
                                    $(this).addClass('span' + width);
                                });
                            }
                            rows.each(function () {
                                for (var j = 0; j < addCount; j++) {
                                    var newColumn = ($('<fd-column></fd-column>'));
                                    $(this).append(newColumn);
                                    $compile(newColumn)(scope);
                                }
                            });
                        } else {
                            var mergedRows = rows.filter('.merged-row');
                            rows = rows.filter(':not(.merged-row)');
                            var leftColumns = rows.children('[fd-column]:nth-child(1)'),
                                leftEmptyColumns = leftColumns.filter(':not(:has([fd-field]))'),
                                fields = $(),
                                removeColumns = $();

                            for (var l = newColumnCount; l < oldColumnCount; l++) {
                                columns = rows.children('[fd-column]:nth-child(' + (l + 1) + ')');
                                fields = $.merge(fields, columns.find('[fd-field]'));
                                removeColumns = $.merge(removeColumns, columns);
                            }
                            fields.each(function (i) {
                                if (i < leftEmptyColumns.length) {
                                    $(leftEmptyColumns[i]).append(this);
                                } else {
                                    var newRow = createNewRow(newColumnCount);
                                    section.find('[fd-field-container]').append(newRow);
                                    $compile(newRow)(scope);
                                    newRow.children('[fd-column]:nth-child(1)').append(this);
                                }
                            });
                            for (var k = 0; k < newColumnCount; k++) {
                                columns = rows.children('[fd-column]:nth-child(' + (k + 1) + ')');
                                width = widths[k];
                                columns.each(function () {
                                    removeSpanClass(this);
                                    $(this).addClass('span' + width);
                                });
                            }
                            removeColumns.remove();
                            if (newColumnCount == 1) {
                                mergedRows.each(function () {
                                    $(this).removeClass('merged-row');
                                });
                            }
                        }
                    }

                    function removeSection() {
                        $.each(watchList, function () {
                            this();
                        });
                        var fields = element.find('[fd-field]');
                        fields.each(function () {
                            this.removeField(true);
                        });
                        element.remove();
                    }

                    function openPropertyDialog() {
                        var section = element;
                        $rootScope.currentSection = {
                            section: section,
                            columns: section.attr('section-columns'),
                            title: section.attr('section-title'),
                            columnsWidth: section.attr('section-columns-width')
                        };
                        $rootScope.$apply();
                        $('#sectionPropertiesDialog').modal({ backdrop: 'static' });
                    }
                }
            };
        })
        .directive('fdRow', function ($compile) {
            return {
                template: '<div fd-row class="data-row clearfix" ng-transclude></div>',
                replace: true,
                restrict: 'E',
                transclude: true,
                link: function (scope, element, attrs) {
                }
            };
        })
        .directive('fdColumn', function ($compile) {
            return {
                template: '<div fd-column ng-transclude></div>',
                replace: true,
                restrict: 'E',
                transclude: true,
                link: function (scope, element, attrs) {
                    var row = element.parent(),
                        width;
                    if (row.hasClass('merged-row')) {
                        width = 12;
                    } else {
                        var section = row.parents('[fd-section]:first'),
                            widths = getColumnWidths(section.attr('section-columns-width'));

                        width = widths[row.children('[fd-column]').index(element)];
                    }
                    element.addClass('span' + width);
                }
            };
        })
        .directive('fdField', function ($compile, $rootScope) {
            return {
                template: '<div fd-field fd-hoverable fd-draggable></div>',
                replace: true,
                restrict: 'E',
                link: function (scope, element, attrs) {
                    var id = newGuid();
                    attrs.$set('id', id);
                    element.click(function (e) {
                        if (e.ctrlKey) {
                            element.toggleClass('selected');
                        }
                    });
                    if (attrs.fieldEmpty != null) {
                        element.append('<div class="span12">Blank Space</div>');
                        element.append('<div class="tools"></div>');
                        var removeItem = $('<fd-tool-remove></fd-tool-remove>');
                        element.find('.tools').append(removeItem);
                        $compile(removeItem)(scope);
                        element.find('.tools')[0].toolRemove = function (removeAll) {
                            var column = element.parents('[fd-column]:first');
                            element.remove();
                            removeAll || adjustColumnsPosition(column, $compile, scope);
                        };

                        element[0].hoverOverHandler = function () {
                            $(this).addClass('highlight');
                            $(this).find('.tools').show();
                        };
                        element[0].hoverOutHandler = function () {
                            $(this).removeClass('highlight');
                            $(this).find('.tools').hide();
                        };
                        return;
                    }
                    if (attrs.fieldText != null) {
                        element.append('<div class="span12 text-content">Sample Text</div>');
                        element.append('<div class="tools"></div>');
                        var propertyItem = $('<fd-tool-property></fd-tool-property>');
                        element.find('.tools').append(propertyItem);
                        $compile(propertyItem)(scope);
                        var removeItem = $('<fd-tool-remove></fd-tool-remove>');
                        element.find('.tools').append(removeItem);
                        $compile(removeItem)(scope);
                        element.find('.tools')[0].toolRemove = function (removeAll) {
                            var column = element.parents('[fd-column]:first');
                            element.remove();
                            removeAll || adjustColumnsPosition(column, $compile, scope);
                        };

                        element[0].hoverOverHandler = function () {
                            $(this).addClass('highlight');
                            $(this).find('.tools').show();
                        };
                        element[0].hoverOutHandler = function () {
                            $(this).removeClass('highlight');
                            $(this).find('.tools').hide();
                        };
                        var openTextDialog = function () {
                            $('#textPropertiesDialog').modal({ backdrop: 'static' });
                        };
                        element.find('.tools')[0].toolProperty = openTextDialog;
                        element.dblclick(openTextDialog);
                        return;
                    }

                    //$rootScope.inLayoutFields.push(attrs.fieldName);
                    inLayoutFields.push(attrs.fieldName);

                    var template = $('script[type="text/ng-template"][id="' + attrs.fieldName + '.html"]').text();
                    template = template.replace(/<(input|select|textarea)/ig, '<$1 disabled');
                    element.html(template);
                    var control = element.find('.control');
                    control.after('<div class="tools"></div>');

                    var propertyItem = $('<fd-tool-property></fd-tool-property>');
                    element.find('.tools').append(propertyItem);
                    $compile(propertyItem)(scope);
                    element.find('.tools').hide();

                    changeToAlwaysOnLayout(attrs.fieldAlwaysOnLayout != null);
                    changeToRequired(attrs.fieldRequired != null);

                    var columnTool = $('<div fd-tool-column></div>');
                    columnTool.click(columnToolHandler);
                    element.find('.tools').append(columnTool);

                    var watchList = [];
                    var watch = $rootScope.$watch(function () {
                        return element.attr('field-required');
                    }, function (newValue) {
                        changeToRequired(newValue != null);
                    });
                    watchList.push(watch);

                    element[0].hoverOverHandler = function () {
                        $(this).addClass('highlight');

                        var columnCount = parseInt($(this).parents('[fd-section]:first').attr('section-columns'));
                        $(this).find('[fd-tool-column]').removeClass('merge split');
                        $(this).find('[fd-tool-column]').hide();
                        if (columnCount > 1) {
                            var row = $(this).parents('[fd-row]');
                            var fieldCount = row.find('[fd-field]').length;
                            if (fieldCount == 1) {
                                var className = row.hasClass('merged-row') ? 'split' : 'merge';
                                $(this).find('[fd-tool-column]').addClass(className);
                                $(this).find('[fd-tool-column]').show();
                            }
                        }
                        $(this).find('.tools').show();
                    };
                    element[0].hoverOutHandler = function () {
                        $(this).removeClass('highlight');
                        $(this).find('.tools').hide();
                    };
                    element.find('.tools')[0].toolProperty = openPropertyDialog;
                    element.find('.tools')[0].toolRemove = removeField;
                    element[0].removeField = removeField;

                    element.dblclick(openPropertyDialog);

                    function columnToolHandler() {
                        var row = element.parents('[fd-row]:first'),
                            section = row.parents('[fd-section]:first'),
                            columnsCount = parseInt(section.attr('section-columns')),
                            column = element.parent();

                        if (row.hasClass('merged-row')) {
                            $(this).removeClass('split');
                            $(this).addClass('merge');
                            removeSpanClass(column);
                            var firstWidth = parseInt(section.attr('section-columns-width'));
                            column.addClass('span' + firstWidth);
                            row.removeClass('merged-row');
                            for (var i = 1; i < columnsCount; i++) {
                                var newColumn = $('<fd-column></fd-column>');
                                row.append(newColumn);
                                $compile(newColumn)(scope);
                            }
                        } else {
                            $(this).removeClass('merge');
                            $(this).addClass('split');
                            removeSpanClass(column);
                            column.addClass('span12');
                            column.siblings().remove();
                            row.addClass('merged-row');
                        }
                    }

                    function openPropertyDialog() {
                        var field = element;
                        $rootScope.currentField = {
                            field: field,
                            readonly: field.attr('field-readonly') != null,
                            required: field.attr('field-required') != null
                        };
                        $rootScope.$apply();
                        var dialogTemplate = $('script[type="text/ng-template"][id="' + field.attr('field-name') + '.setting"]').text();
                        $('#fieldPropertiesDialog .modal-body').html(dialogTemplate);
                        $('#fieldPropertiesDialog').modal({ backdrop: 'static' });
                    }

                    function removeWatchListeners() {
                        $.each(watchList, function () {
                            this();
                        });
                    }

                    function removeField(removeAll) {
                        removeWatchListeners();

                        var column = element.parents('[fd-column]:first');
                        var field = element;
                        //var fieldIndex = $.inArray(field.attr('field-name'), $rootScope.inLayoutFields);
                        var fieldIndex = $.inArray(field.attr('field-name'), inLayoutFields);
                        //$rootScope.inLayoutFields.splice(fieldIndex, 1);
                        inLayoutFields.splice(fieldIndex, 1);
                        $rootScope.$apply();
                        field.remove();
                        removeAll || adjustColumnsPosition(column, $compile, scope);
                    }

                    function changeToRequired(required) {
                        if (required) {
                            if (!element.find('.required-image').length) {
                                var img = $('<img data-toggle="tooltip" data-delay="250" data-placement="bottom" title="Required" class="required-image" src="/OrchardLocal/Modules/Coevery.Metadata/Styles/formdesigner/images/required12.gif">');
                                element.find('.title').prepend(img);
                            }
                        } else {
                            element.find('.required-image').remove();
                        }
                    }

                    function changeToAlwaysOnLayout(required) {
                        if (required) {
                            if (!element.find('.layout-image').length) {
                                var img = $('<img class="layout-image" src="/OrchardLocal/Modules/Coevery.Metadata/Styles/formdesigner/images/alwaysdisplay12.gif">');
                                element.find('.title').prepend(img);
                            }
                            element.find('[fd-tool-remove]').remove();
                        } else {
                            element.find('.layout-image').remove();

                            var removeItem = $('<fd-tool-remove></fd-tool-remove>');
                            element.find('.tools').append(removeItem);
                            $compile(removeItem)(scope);
                        }
                    }
                }
            };
        })
        .directive('fdToolRemove', function ($compile) {
            return {
                template: '<div fd-tool-remove fd-hoverable class="remove" data-toggle="tooltip" data-delay="250" data-placement="bottom" title="Remove"></div>',
                replace: true,
                restrict: 'E',
                link: function (scope, element, attrs) {
                    element[0].hoverOverHandler = function () {
                        $(this).addClass('highlight');
                    };
                    element[0].hoverOutHandler = function () {
                        $(this).removeClass('highlight');
                    };
                    element.click(function () {
                        var toolsContainer = element.parent()[0];
                        toolsContainer.toolRemove && toolsContainer.toolRemove();
                    });
                }
            };
        })
        .directive('fdToolProperty', function ($compile) {
            return {
                template: '<div fd-tool-property fd-hoverable class="property" data-toggle="tooltip" data-delay="250" data-placement="bottom" title="Properties"></div>',
                replace: true,
                restrict: 'E',
                link: function (scope, element, attrs) {
                    element[0].hoverOverHandler = function () {
                        $(this).addClass('highlight');
                    };
                    element[0].hoverOutHandler = function () {
                        $(this).removeClass('highlight');
                    };

                    element.click(function () {
                        var toolsContainer = element.parent()[0];
                        toolsContainer.toolProperty && toolsContainer.toolProperty();
                    });
                }
            };
        })
        .directive('fdFieldPropertiesDialog', function ($compile, $rootScope) {
            return {
                template: '<div id="fieldPropertiesDialog" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h3 id="myModalLabel">Field Properties</h3></div><div class="modal-body"><p><label class="checkbox"><input type="checkbox" ng-model="currentField.readonly"/><strong>Read-Only</strong></label></p><p><label class="checkbox"><input type="checkbox" ng-model="currentField.required"/><strong>Required</strong></label></p></div><div class="modal-footer"><button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button><button class="btn btn-primary">Ok</button></div></div>',
                replace: true,
                restrict: 'E',
                link: function (scope, element, attrs) {
                    element.find('.btn-primary').click(function (parameters) {
                        $rootScope.currentField.readonly
                            ? $rootScope.currentField.field.attr('field-readonly', '')
                            : $rootScope.currentField.field.removeAttr('field-readonly');
                        $rootScope.currentField.required
                            ? $rootScope.currentField.field.attr('field-required', '')
                            : $rootScope.currentField.field.removeAttr('field-required');

                        $rootScope.$apply();
                        $('#fieldPropertiesDialog').modal('hide');
                    });
                }
            };
        })
        .directive('fdSectionPropertiesDialog', function ($rootScope) {
            return {
                template: '<div id="sectionPropertiesDialog" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button><h3 id="myModalLabel">Section Properties</h3></div><div class="modal-body"><form class="form-horizontal"><div class="control-group"><label class="control-label">Section Title</label><div class="controls"><input type="text" ng-model="currentSection.title" /></div></div><div class="control-group"><label class="control-label">Section Layout</label><div class="controls"><label class="radio"><input type="radio" ng-model="currentSection.columns" value="1" />1-Columns                        </label><label class="radio"><input type="radio" ng-model="currentSection.columns" value="2" />2-Columns                        </label></div></div><div class="control-group" ng-show="currentSection.columns==2"><label class="control-label">Columns Width</label><div class="controls"><label class="radio"><input type="radio" ng-model="currentSection.columnsWidth" value="3:9" />25% + 75%                        </label><label class="radio"><input type="radio" ng-model="currentSection.columnsWidth" value="4:8" />33% + 67%                        </label><label class="radio"><input type="radio" ng-model="currentSection.columnsWidth" value="6:6" />50% + 50%                        </label><label class="radio"><input type="radio" ng-model="currentSection.columnsWidth" value="8:4" />67% + 33%                        </label><label class="radio"><input type="radio" ng-model="currentSection.columnsWidth" value="9:3" />75% + 25%                        </label></div></div></form></div><div class="modal-footer"><button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button><button class="btn btn-primary">Ok</button></div></div>',
                replace: true,
                restrict: 'E',
                link: function (scope, element, attrs) {
                    element.find('.btn-primary').click(function () {
                        $rootScope.currentSection.section.attr('section-columns', $rootScope.currentSection.columns);
                        $rootScope.currentSection.section.attr('section-title', $rootScope.currentSection.title);
                        var width = $rootScope.currentSection.columns == 1
                            ? 12
                            : $rootScope.currentSection.columnsWidth;
                        $rootScope.currentSection.section.attr('section-columns-width', width);
                        $rootScope.$apply();
                        $('#sectionPropertiesDialog').modal('hide');
                    });
                }
            };
        })
        .directive('fdFieldContainer', function ($compile, $rootScope) {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.droppable({
                        accept: '[fd-field], [fd-tools-field]',
                        tolerance: "pointer",
                        hoverClass: 'drop-hover',
                        drop: function (event, ui) {
                            $rootScope.dragHandler = null;

                            var dragItem;
                            if (ui.draggable.is('[fd-tools-field]')) {
                                dragItem = $('<fd-field></fd-field>');
                                dragItem.attr('field-text', ui.draggable.attr('field-text'));
                                dragItem.attr('field-empty', ui.draggable.attr('field-empty'));
                                dragItem.attr('field-required', ui.draggable.attr('required'));
                                dragItem.attr('field-name', ui.draggable.attr('field-name'));
                                $compile(dragItem)(scope);
                                $rootScope.$apply();
                            } else {
                                dragItem = ui.draggable;
                            }

                            var markedRow = placeIndicator.markedRow,
                                markedRowColumns = placeIndicator.markedRow.children('[fd-column]'),
                                columnIndex = placeIndicator.columnIndex,
                                markedColumn = $(markedRowColumns[columnIndex]),
                                id = markedRow.hasClass('merged-row')
                                    ? markedRow.find('[fd-field]').attr('id')
                                    : markedColumn.children('[fd-field]').attr('id');

                            if (id == dragItem.attr('id')) {
                                placeIndicator.hide();
                                return;
                            }
                            var dragRow = dragItem.parents('[fd-row]:first');
                            if (dragRow.hasClass('merged-row')) {
                                placeIndicator.isAbove
                                    ? markedRow.before(dragRow)
                                    : markedRow.after(dragRow);
                            } else {
                                var rows = placeIndicator.isAbove
                                    ? markedRow.hasClass('merged-row')
                                        ? $()
                                        : markedRow.nextUntil('.merged-row').andSelf()
                                    : markedRow.nextUntil('.merged-row'),
                                    columns = rows.find('[fd-column]:nth-child(' + (columnIndex + 1) + ')'),
                                    filledColumns = columns.has('[fd-field]:not(.dragging)'),
                                    dragColumn = dragItem.parents('[fd-column]:first');

                                if (filledColumns.length == columns.length) {
                                    var columnCount = parseInt($(this).parents('[fd-section]:first').attr('section-columns')),
                                        newRow = createNewRow(columnCount);

                                    rows.length
                                        ? rows.last().after(newRow)
                                        : placeIndicator.isAbove
                                            ? placeIndicator.markedRow.before(newRow)
                                            : placeIndicator.markedRow.after(newRow);
                                    $compile(newRow)(scope);
                                    columns.splice(columns.length, 0, newRow.children()[columnIndex]);
                                }

                                var fields = filledColumns.children('[fd-field]');
                                fields.splice(0, 0, dragItem[0]);
                                for (var i = 0; i < fields.length; i++) {
                                    $(columns[i]).append(fields[i]);
                                }

                                if (dragColumn.length && columns.index(dragColumn) == -1) {
                                    adjustColumnsPosition(dragColumn);
                                }
                            }

                            placeIndicator.hide();
                        },
                        over: function (event, ui) {
                            $rootScope.dragHandler = function (dragEvent, dragUi) {
                                markColumn({
                                    x: dragEvent.pageX,
                                    y: dragEvent.pageY
                                });
                            };
                            $rootScope.dragHandler(event, ui);
                        },
                        out: function (event, ui) {
                            $rootScope.dragHandler = null;
                            placeIndicator.hide();
                        }
                    });

                    function markColumn(position) {
                        var rows = element.children('[fd-row]'),
                            widths = getColumnWidths(element.parents('[fd-section]:first').attr('section-columns-width')),
                            currentPosition = (position.x - rows.offset().left) / (rows.width() / 12),
                            columnIndex;

                        $.each(widths, function (i, n) {
                            currentPosition -= n;
                            if (currentPosition <= 0) {
                                columnIndex = i;
                                return false;
                            }
                        });

                        for (var j = 0; j < rows.length; j++) {
                            var row = $(rows[j]),
                                rowTop = row.offset().top,
                                rowHeight = row.height(),
                                result = position.y >= rowTop && position.y < rowTop + rowHeight
                                    ? (position.y < rowTop + rowHeight / 2 ? true : false)
                                    : null;

                            if (result != null) {
                                var column = row.find('[fd-column]:nth-child(' + (columnIndex + 1) + ')'),
                                    above, markedRow;

                                if (column.children('[fd-field]').length) {
                                    above = result && j == 0;
                                    var index = result && j ? j - 1 : j;
                                    markedRow = $(rows[index]);
                                } else if (!result && row.hasClass('merged-row')) {
                                    above = false;
                                    markedRow = row;
                                } else {
                                    var prevRow = row.prevAll('.merged-row,:has([fd-column]:nth-child(' + (columnIndex + 1) + '):has([fd-field]))').first();
                                    above = !prevRow.length;
                                    markedRow = prevRow.length ? prevRow : rows.first();
                                }
                                placeIndicator.show(markedRow, columnIndex, above);
                                break;
                            }
                        }
                    }
                }
            };
        })
        .directive('fdDraggable', function ($rootScope) {
            var zIndex = 101;

            function setZIndex(jQueryElem) {
                jQueryElem.css('z-index', ++zIndex);
            }

            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    element.css('cursor', 'move');
                    element.draggable({
                        revert: "invalid",
                        connectToSortable: attrs.dragConnectToSortable,
                        handle: attrs.dragHandle,
                        helper: getHelper,
                        //cursorAt: { left: -5, top: -5 },
                        tolerance: 'pointer',
                        distance: 10,
                        //scroll: false,
                        start: function (event, ui) {
                            $rootScope.enableHover = false;
                            setZIndex(ui.helper);
                            $(event.target).addClass('dragging');
                        },
                        stop: function (event, ui) {
                            $rootScope.enableHover = true;
                            $(event.target).removeClass('dragging');
                        },
                        drag: function (event, ui) {
                            if ($rootScope.dragHandler) {
                                $rootScope.dragHandler(event, ui);
                            }
                        }
                    });

                    element[0].disableDraggable = function () {
                        element.css('cursor', 'default');
                        $(this).draggable("disable");
                    };
                    element[0].enableDraggable = function () {
                        element.css('cursor', 'move');
                        $(this).draggable("enable");
                    };
                }
            };
        })
        .directive('fdHoverable', function ($rootScope) {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    $rootScope.enableHover = true;
                    element.hover(
                        function () {
                            $rootScope.enableHover && this.hoverOverHandler && this.hoverOverHandler();
                        },
                        function () {
                            this.hoverOutHandler && this.hoverOutHandler();
                        }
                    );
                }
            };
        })
        .directive('fdSaveLayoutButton', function ($resource, logger, $stateParams) {
            return {
                link: function (scope, element, attrs) {
                    element.click(function () {
                        var sections = $('[fd-form]').find('[fd-section]');
                        var layoutObject = [];
                        sections.each(function () {
                            if ($(this).find('[fd-field]').length) {
                                var columnCount = $(this).attr('section-columns'),
                                    width = $(this).attr('section-columns-width'),
                                    sectionTitle = $(this).attr('section-title');
                                var section = {
                                    SectionColumns: columnCount,
                                    SectionColumnsWidth: width,
                                    SectionTitle: sectionTitle,
                                    Rows: []
                                };
                                layoutObject.push(section);
                                var rows = $(this).find('[fd-row]');
                                rows.each(function () {
                                    var row = {
                                        Columns: [],
                                        IsMerged: $(this).hasClass('merged-row')
                                    };
                                    section.Rows.push(row);
                                    var columns = $(this).find('[fd-column]');
                                    columns.each(function () {
                                        var column = {};
                                        row.Columns.push(column);
                                        var field = $(this).find('[fd-field]');
                                        if (field.length) {
                                            column.Field = {
                                                FieldName: field.attr('field-name'),
                                            };
                                        }
                                    });
                                });
                            }
                        });

                        var entityName = $stateParams.EntityName;
                        $.ajax({
                            type: 'POST',
                            contentType: 'application/json',
                            url: '/OrchardLocal/api/formdesigner/layout/' + entityName,
                            data: JSON.stringify(layoutObject),
                            success: function (msg) {
                                logger.success('Save success');
                            }
                        });
                    });
                }
            };
        })
        .directive('btnActions', function () {
            return {
                template: '<div btn-actions ng-transclude ng-style="BtnActionLeft()" class="btn-toolbar pull-left"></div>',
                replace: true,
                scope: {},
                restrict: 'E',
                transclude: true,
                controller: ['$scope', '$element', '$attrs', '$transclude', '$window', function ($scope, $element, $attrs, $transclude, $window) {
                    $scope.BtnActionLeft = function () {
                        if ($element.hasClass('btn-fixed') && $('#page-title>h1').length > 0) {
                            var left = $('#page-title>h1').offset().left;
                            var width = $('#page-title>h1').width();
                            btnLeft = left + width + 20;
                            return { left: btnLeft };
                        } else {
                            return { left: 'auto' };
                        }
                    };
                    angular.element($window).bind("scroll", function () {
                        var scrollTop = $(window).scrollTop();
                        if (scrollTop > 35) {
                            $element.addClass('btn-fixed');
                        } else {
                            $element.removeClass('btn-fixed');
                        }
                        $element.css('left', $scope.BtnActionLeft().left);
                    });
                }]
            };
        });
});