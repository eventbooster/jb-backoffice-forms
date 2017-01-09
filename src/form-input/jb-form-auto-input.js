(function () {
    'use strict';

    /**
     * @notes: removed jQuery dependency, made the types injectable, did cleanup
     * @notes:  The directive triggers an additional compilation phase after it has gotten the options data, therefore
     *          the options are available within the sub components controllers. While this is necessary to render
     *          the content correctly, it also creates a fixed dependency between some components and the
     *          auto-form-element. The main problem is the fact that not all components need the same data. Further,
     *          some components require the option data to be able to register their selects.
     *
     */

    /**
     * Directive for autoFormElements: Replaces itself with the corresponding input element
     * as soon as the detailView directive has gotten the necessary data (type, required etc.)
     * from the server through an options call
     */
    var   typeKey = 'jb.formAutoInputTypes'
        , _module = angular.module('jb.formComponents');

    _module.value(typeKey, {
          'text'    : 'text'
        , 'number'  : 'text'
        , 'string'  : 'text'
        , 'boolean' : 'checkbox'
        , 'datetime': 'date-time'
        , 'date'    : 'date-time'
    });

    _module.directive('jbFormAutoInput', ['$compile', '$parse', function ($compile, $parse) {

        return {
              controllerAs      : '$ctrl'
            , bindToController  : true
            , restrict          : 'E'
            , link : {
                post: function (scope, element, attrs, ctrl) {

                    var   readonlyGetter
                        , showLabelGetter
                        , hideElementGetter
                        , modelGetter;

                    ctrl.hasModel = attrs.hasOwnProperty('inputModel');
                    if(ctrl.hasModel){
                        modelGetter = $parse(attrs.inputModel);
                        scope.$watch(function(){
                            return modelGetter(scope.$parent);
                        },
                        function(newValue){
                            ctrl.inputModel = newValue;
                        });
                    }

                    ctrl.hasLabel = attrs.hasOwnProperty('label');
                    if(ctrl.hasLabel){
                        attrs.$observe('label', function(newValue){
                            ctrl.label = newValue;
                        });
                    }
                    attrs.$observe('for', function(newValue){
                        ctrl.name = newValue;
                    });

                    if(attrs.hasOwnProperty('showLabel')){
                        showLabelGetter = $parse(attrs.showLabel);
                        scope.$watch(function(){
                            return showLabelGetter(scope.$parent)
                        }, function(value){
                            ctrl.showLabel = value;
                        });
                    }

                    if(attrs.hasOwnProperty('inputHidden')){
                        hideElementGetter = $parse(attrs.inputHidden);
                        scope.$watch(function(){
                            return hideElementGetter(scope.$parent)
                        }, function(value){
                            ctrl.inputHidden = value;
                        });
                    }

                    if(attrs.hasOwnProperty('isReadonly')){
                        readonlyGetter = $parse(attrs.isReadonly);
                        scope.$watch(function(){
                            return readonlyGetter(scope.$parent);
                        },  function(newValue){
                            ctrl.isReadonly = newValue;
                        });
                    }

                    ctrl.init(scope, element, attrs);
                }
                , pre: function (scope, element, attrs, ctrl) {
                    ctrl.preLink(scope, element, attrs);
                }
            }
            , controller        : 'JBFormAutoInputController'
            , scope             : true
        };
    }]);

    function JBFormAutoInputController($scope, $attrs, $compile, fieldTypes, subcomponentsService) {

        this.$scope     = $scope;
        this.$attrs     = $attrs;
        this.$compile   = $compile;
        this.fieldTypes = fieldTypes;

        this.name       = $attrs.for;
        this.label      = this.name;

        this.subcomponentsService   = subcomponentsService;
        this.registry               = null;
    }

    JBFormAutoInputController.prototype.preLink = function (scope, element, attrs) {
        this.registry = this.subcomponentsService.registryFor(scope);
        this.registry.listen();
    };

    JBFormAutoInputController.prototype.init = function (scope, element, attrs) {
        this.element = element;
        this.registry.registerOptionsDataHandler(this.updateElement.bind(this));
        this.registry.registerYourself();
    };
    // @todo: share this functionality with all the other literal inputs
    JBFormAutoInputController.prototype.selectOptions = function(optionsData){
        var properties = (optionsData) ? optionsData.properties : optionsData;
        if(!properties || !properties.length) return;
        for( var i = 0; i < properties.length; i++ ) {
            if(properties[i].name == this.name) return properties[i];
        }
        return;
    };

    /**
     * @todo: switch into an error state if there is no spec or corresponding type
     * @todo: think about a more angularish version of this procedure, since it is super messy!
     * @param fieldSpec
     */
    JBFormAutoInputController.prototype.updateElement = function(fieldSpec){

            var   elementType
                , elementSpec = this.selectOptions(fieldSpec)
                , elementTypeDashed
                , elementTypeTag
                , newElement;

            if (!elementSpec || !elementSpec.type) {
                console.error('AutoFormElement: fieldSpec %o is missing type for field %o', fieldSpec, this.name);
                return;
            }

            elementType = this.fieldTypes[elementSpec.type];

            if (!elementType) {
                console.error('AutoFormElement: Unknown type %o', fieldSpec.type);
                console.error('AutoFormElement: elementType missing for element %o', this.element);
                return;
            }

            console.log('AutoFormElement: Create new %s from %o', elementType, fieldSpec);

            // camelCase to camel-case
            elementTypeDashed   = elementType.replace(/[A-Z]/g, function (v) { return '-' + v.toLowerCase(); });
            elementTypeTag      = 'jb-form-' + elementTypeDashed + '-input';
            newElement          = angular.element('<div>');

            newElement.attr(elementTypeTag  , '');
            newElement.attr('for'           , '{{$ctrl.name}}');
            newElement.attr('is-readonly'   , '$ctrl.isReadonly');
            newElement.attr('ng-hide'       , "$ctrl.inputHidden");

            if(this.hasLabel) newElement.attr('label'       , '{{$ctrl.label}}');
            if(this.hasModel) newElement.attr('input-model' , '$ctrl.inputModel');

            this.registry.unregisterOptionsDataHandler(this.updateElement);
            this.element.append(newElement);
            // if we do not replace the element, we might end up in a loop!
            this.$compile(newElement)(this.$scope);
            // now the registry should know all the subcomponents
            // delegate to the options data handlers of the components
            return this.registry.optionsDataHandler(fieldSpec);
    };

    _module.controller('JBFormAutoInputController', [
        '$scope',
        '$attrs',
        '$compile',
        typeKey,
        'JBFormComponentsService',
        JBFormAutoInputController ]);
})();

