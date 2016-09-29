(function(undefined){
    "use strict";
    /**
     * @todo: This directive needs some refactoring!
     */
    var _module = angular.module('jb.backofficeFormComponents');

    _module.directive('entityLocale', function(){
        return {
              controller: 'BackofficeEntityLocaleController'
            , controllerAs: '$ctrl'
            , bindToController: true
            , scope: {
                  fields        : '<'
                , entityName    : '@entity'
                , relationName  : '@relation'
            }
            , template: '<div class="locale-component row">' +
                            '<div>' +
                            '<ul class="nav nav-tabs">' +
                                '<li ng-repeat="language in $ctrl.getSupportedLanguages()" ng-class="{active:$ctrl.isSelected(language)}">'+
                                    '<a href="#" ng-click="$ctrl.toggleLanguage($event, language)">'+
                                        '{{language.code|uppercase}}' +
                                        '<span data-ng-if="$ctrl.checkForTranslation(language)" class="fa fa-check"></span>' +
                                    '</a>'+
                                '</li>'+
                            '</ul>'+
                            '</div>' +
                            '<div class="locale-content clearfix">' +
                                '<div class="locale-col" ng-repeat="language in $ctrl.getSelectedLanguages()">' +
                                    '<p>{{ language.code | uppercase }}</p>' +
                                    '<ul>' +
                                        '<li ng-repeat="field in $ctrl.getFields()">' +
                                            '<label ng-attr-for="locale-{{language.code}}-{{field.name}}" ng-class="{ \'invalid\' : !$ctrl.fieldIsValid($ctrl.locales[ language.id ], field.name)}">' +
                                                '<span data-translate="web.backoffice.{{$ctrl.entityName}}.{{field.name}}"></span>' +
                                                '<span class="required-indicator" data-ng-show="field.required">*</span>' +
                                            '</label>' +
                                            '<textarea ng-model="$ctrl.locales[ language.id ][ field.name ]" ' +
                                                'ng-attr-id="locale-{{language.code}}-{{field.name}}"' +
                                                'class="form-control" ' +
                                                'ng-keyup="$ctrl.adjustHeight( $event )" ' +
                                                'ng-click="$ctrl.adjustHeight( $event )" />' +
                                            '</textarea>' +
                                        '</li>'+
                                    '</ul>' +
                                '</div>' +
                            '</div>' +
                        '</div>'

            , link: {
                pre: function(scope, element, attrs, ctrl){
                    ctrl.preLink(scope, element, attrs);
                }
                , post: function(scope, element, attrs, ctrl){
                    ctrl.postLink(scope, element, attrs);
                }
            }
        };
    });
    /**
     * @todo: remove unnecessary fuzz
     * @param $scope
     * @param $q
     * @param $timeout
     * @param api
     * @param componentsService
     * @param sessionService
     * @constructor
     */
    function BackofficeEntityLocaleController($scope, $q, $timeout, api, componentsService, sessionService, boAPIWrapper){
        this.$scope             = $scope;
        this.api                = api;
        this.$q                 = $q;
        this.$timeout           = $timeout;
        this.componentsService  = componentsService;
        this.options            = null;
        this.fieldDefinitions   = null;
        this.selectedLanguages  = [];
        this.locales            = [];
        this.originalLocales    = [];
        this.heightElement      = null;
        this.heightElementInitialized = false;
        this.boAPI              = boAPIWrapper;
        this.supportedLanguages = (sessionService.get('supported-languages', 'local') || []).map(function(item, index){
            var lang = angular.copy(item.language);
            lang.selected = false;
            return lang;
        }, this);
        this.element = null;
    }

    BackofficeEntityLocaleController.prototype.preLink = function(){};
    BackofficeEntityLocaleController.prototype.postLink = function(scope, element, attrs){
        this.componentsService.registerComponent(scope, this);
        this.heightElement = angular.element('<div></div>');
        this.heightElement = this.heightElement.attr('id', 'locale-height-container');
        this.heightElement.css('position', 'absolute');
        this.heightElement.css('left', '-9999px');
        this.heightElement.css('top', '-9999px');
        this.element = element;
        this.element.append(this.heightElement);
    };

    BackofficeEntityLocaleController.prototype.registerAt = function(parent){
        parent.registerOptionsDataHandler(this.handleOptionsData.bind(this));
        parent.registerGetDataHandler(this.handleGetData.bind(this));
    };

    BackofficeEntityLocaleController.prototype.getSelectedLanguages = function(){
        var selected = [];
        for(var i=0; i<this.supportedLanguages.length; i++){
            var lang = this.supportedLanguages[i];
            if(lang.selected === true) selected.push(lang);
        }
        return selected;
    };

    BackofficeEntityLocaleController.prototype.getSupportedLanguages = function(){
        return this.supportedLanguages;
    };

    BackofficeEntityLocaleController.prototype.fieldIsValid = function(locale, property){

        var   definition = this.fieldDefinitions[property];
        // fields of locales which do not yet exist are not validated
        if(!locale) return true;
        if(definition.required === true) return !this._localePropertyIsEmpty(locale[property]);
        return true;
    };

    BackofficeEntityLocaleController.prototype.adjustHeight = function(event){
        var   element       = angular.element(event.currentTarget);
        this.adjustElementHeight(element);
    };

    BackofficeEntityLocaleController.prototype.adjustElementHeight = function(element){

        var   scrollHeight  = element[0].scrollHeight
            , clientHeight  = element[0].clientHeight
            , hasOverflow   = scrollHeight > clientHeight
            , targetWidth   = element.width()
            , overflow      = hasOverflow ? 'scroll' : 'auto'
            , textValue     = element.val();

        if(!this.heightElementInitialized) this.initializeHeightElement(element);

        this.heightElement.width(targetWidth);
        this.heightElement.css('overflow-y', overflow);
        // adds the content or a placeholder text (to preserve the basic height)
        textValue = textValue.replace(/(\n\r?)/g, '<br>').replace(/(\<br\>\s*)$/, '<br><br>');
        if(textValue.trim() == '') textValue = 'empty';

        this.heightElement.html(textValue);
        element.height(this.heightElement.height());
    };

    BackofficeEntityLocaleController.prototype.adjustAllHeights = function(){
        this.element.find('textarea').each(function(index, element){
            this.adjustElementHeight(angular.element(element));
        }.bind(this));
    };

    BackofficeEntityLocaleController.prototype.initializeHeightElement = function(element){

        [     'font-size'
            , 'font-family'
            , 'font-weight'
            , 'letter-spacing'
            , 'line-height'
            , 'padding-top'
            , 'padding-left'
            , 'padding-right'
            , 'padding-bottom'
            , 'border-radius'
            , 'border'].forEach(function(property){
                this.heightElement.css(property, element.css(property));
            }, this);
        this.heightElementInitialized = true;
    };

    BackofficeEntityLocaleController.prototype.toggleLanguage = function(event, language){
        if(event) event.preventDefault();
        var langs = this.getSelectedLanguages();
        if(language.selected && langs.length == 1) return;
        language.selected = language.selected !== true;
        this.$timeout(this.adjustAllHeights.bind(this));
    };

    BackofficeEntityLocaleController.prototype.isSelected = function(language){
        return language.selected === true;
    };

    BackofficeEntityLocaleController.prototype.checkForTranslation = function(language){
        return !!(this.locales && angular.isDefined( this.locales[language.id] ));
    };

    BackofficeEntityLocaleController.prototype.translationIsEmpty = function(data){
        return this.fields.reduce(function(previous, field){
            return previous && !data[field];
        }, true);
    };

    /**
     * Takes the options data passed by the containing component, and sets up the corresponding fieldDefinitions which
     * are necessary to validate the contained fields.
     *
     * @note: In the select call we need to set the related table name and select all fields plus the languages. Currently
     * we are not able to properly identify locales.
     */
    BackofficeEntityLocaleController.prototype.handleOptionsData = function(data){
        var spec;

        if(!data || !angular.isDefined(data[this.relationName])) return console.error('No OPTIONS data found in locale component.');
        spec            = data[this.relationName];

        this.options    = spec;
        this.loadFields().then(function(fields){
            this.$timeout(function(){
                this.fieldDefinitions = fields;
            }.bind(this));
        }.bind(this), function(error){
            console.error(error);
        });
    };

    /**
     * @todo: find a proper way to resolve the endpoint!!
     * @returns {*}
     */
    BackofficeEntityLocaleController.prototype.loadFields = function(){
        var url = '/' + this.options.tableName;
        if(this.fieldDefinitions) return this.$q.when(this.fieldDefinitions);
        return this.boAPI.getOptions(url).then(function(fields){
            return this.fields.reduce(function(map, fieldName){
                map[fieldName] = fields[fieldName];
                return map;
            }.bind(this), {});
        }.bind(this), function(error){
            console.error(error);
        });
    };

    BackofficeEntityLocaleController.prototype._localeIsEmpty = function(locale){
        return this.fields.every(function(fieldName){
            return this._localePropertyIsEmpty(locale[fieldName]);
        }, this);
    };

    BackofficeEntityLocaleController.prototype._localePropertyIsEmpty = function(value){
        return angular.isUndefined(value) || value.trim() == '';
    };

    BackofficeEntityLocaleController.prototype._localeGetChanges = function(locale, originalLocale){
        // the locale is new
        if(!angular.isDefined(originalLocale)){
            // the locale has no data, meaning that there are no changes
            if(this._localeIsEmpty(locale)){
                return [];
            }
            // otherwise all fields are new
            return this.fields;
        }
        // collect all fields which do not hold the same value
        return this.fields.reduce(function(changedFields, fieldName){
            if(locale[fieldName] != originalLocale[fieldName]){
                changedFields.push(fieldName);
            }
            return changedFields;
        }.bind(this), []);
    };

    /**
     * We could also adjust the _localeGetChanges method to be able to deal with locales that were not created.
     */
    BackofficeEntityLocaleController.prototype.getSaveCalls = function(){

        var   calls     = [];

        this.locales.forEach(function(locale, id){

            var   originalLocale    = this.originalLocales[id]
                , localeExisted     = angular.isDefined(originalLocale);

            // Locale exists (means it was created by the angular binding or was already present)
            if(locale) {
                var   changes = this._localeGetChanges(locale, originalLocale)
                    , method  = (localeExisted) ? 'PATCH' : 'POST';
                // There are changes
                if(changes.length > 0) {
                    var call = {};
                    call.data = changes.reduce(function(entity, field){
                            entity[field] = locale[field];
                            return entity;
                    }, {});

                    call.url            = {};
                    call.url.path       = 'language/'+id;
                    call.url.mainEntity = 'prepend';

                    call.method = method;
                    calls.push(call);
                }
            }
        }, this);

        return calls;
    };

    BackofficeEntityLocaleController.prototype.handleGetData = function(data){
        var locales             = data[this.options.tableName];
        if(locales){
            this.originalLocales    = this.normalizeModel(locales);
            this.locales            = angular.copy(this.originalLocales);
        }
        if(this.getSelectedLanguages().length === 0) {
            return this.$timeout(function(){ this.toggleLanguage(null, this.supportedLanguages[0]);}.bind(this));
        }
        this.$timeout(this.adjustAllHeights.bind(this));
    };

    BackofficeEntityLocaleController.prototype.getFields = function(){
        if(!this.fieldDefinitions) return [];
        return Object.keys(this.fieldDefinitions).map(function(fieldName){
            return this.fieldDefinitions[fieldName];
        }, this);
    };

    BackofficeEntityLocaleController.prototype.normalizeModel = function(data){
        return data.reduce(function(map, item){
            map[item.language.id] = item;
            return map;
        }, []);
    };

    BackofficeEntityLocaleController.prototype.getLocales = function(){
        return this.locales;
    };
    /**
     * @todo: Load all fields and then eliminate primary and foreign keys. In this case we don't need to release the
     * backoffice if the table is extended with new locales.
     *
     * @returns {*}
     */
    BackofficeEntityLocaleController.prototype.getSelectFields = function(){

        var   localeTableName   = this.options.tableName
            , languageSelector  = [localeTableName, 'language', '*'].join('.')
            , selects;

        selects =  this.fields.map(function(field){
            return [localeTableName, field].join('.');
        }, this);

        selects.push(languageSelector);
        return selects;
    };

    /**
     * @todo: use the registration system to detect all the input fields and let them validate themselves?
     */
    BackofficeEntityLocaleController.prototype.isValid = function(){
        return this.locales.reduce(function(localeValidity, locale, index){
            if(angular.isUndefined(locale)) return localeValidity;
            if(angular.isUndefined(this.originalLocales[index]) && this._localeIsEmpty(locale)) return localeValidity;
            return localeValidity && this.fields.reduce(function(fieldValidity, fieldName){
                    return fieldValidity && this.fieldIsValid(locale, fieldName);
            }.bind(this), true);
        }.bind(this), true);
    };

    _module.controller('BackofficeEntityLocaleController', [
          '$scope'
        , '$q'
        , '$timeout'
        , 'APIWrapperService'
        , 'backofficeSubcomponentsService'
        , 'SessionService'
        , 'BackofficeAPIWrapperService'
        , BackofficeEntityLocaleController
    ]);
})();