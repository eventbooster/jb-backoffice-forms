/**
 * @todo: test directive
 * @todo: test controller
 * @todo: create an example result of an options call which we can use for the tests
 */
describe('jb.formTextInput', function(){

    describe('JBFormTextInputController', function(){

        var   $controller
            , inputController
            , $scope
            , formEvents
            , $rootScope;

        beforeEach(module('jb.formEvents', 'jb.formComponents'));
        beforeEach(inject([
              '$controller'
            , '$rootScope'
            , '$q'
            , 'JBFormComponentsService'
            , function(_$controller_, _$rootScope_, _$q_, JBFormComponentsService){

                $controller = _$controller_;
                $scope      = _$rootScope_.$new();
                $rootScope  = _$rootScope_;

                inputController = $controller('JBFormTextInputController', {
                    $scope                : $scope
                    , $attrs                : {
                        for : 'test'
                    }
                    , $q                    : _$q_
                    , JBFormComponentsService : JBFormComponentsService
                });

            }]));


            it('should be defined', function(){
                expect(inputController).toBeDefined();
            });

            it('exposes an isRequird method which should return true by default (to avoid saving before proper population)', function(){
                expect(inputController.isRequired).toBeFunction();
                expect(inputController.isRequired()).toBeTrue();
            });

            it('should be able to pick the correct options data and adjust its state', function(){
                var options = {
                    properties : [
                        {
                            name      : 'test'
                            , nullable  : true
                        }
                    ]
                };
                inputController.handleOptionsData(options);
                expect(inputController.isRequired()).toBeFalse();
            });

            it('exposes an isValid method', function(){
                expect(inputController.isValid).toBeFunction();
            });
    });

    describe('Test jb-form-text-input directive\'s', function(){

        var   $compile
            , $rootScope;

        describe('default behavior', function(){

            var element;

            beforeEach(module('jb.formEvents', 'jb.formComponents'));
            beforeEach(inject([
                '$rootScope'
                , '$compile'
                , function(_$rootScope_, _$compile_){
                    $rootScope  = _$rootScope_;
                    $compile    = _$compile_;
                    element = $compile('<jb-form-text-input></jb-form-text-input>')($rootScope);
                    $rootScope.$digest();
                }]));

            it('renders a label even if the label identifier is empty', function(){
                expect(element.find('label').length).toBe(1);
            });

            it('renders an input of type text', function(){
                var inner = angular.element(element[0].querySelector('input[type="text"]'));
                expect(inner.length).toBe(1);
            });
        });
    });



    /*it('init method emits an event on the scope', function(){
        spyOn($scope, '$emit');
        var   elements = []
            , handlers = [];

        inputController.init($scope);

        expect($scope.$emit).toHaveBeenCalledWith(formEvents.registerComponent, inputController);
        expect(elements).toBeArrayOfSize(1);
        expect(handlers).toBeArrayOfSize(1);
    });*/
});