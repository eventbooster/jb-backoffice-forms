(function(undefined) {

    'use strict';

    /**
     * Auto language input. Inherits from AutoInput.
     *
     * @todo: remove the dependency to the detailViewController
     * @todo: remove the dependency to the optionData (Does not work outside the auto-form-element since the optionData
     * is required and usually is not available during compilation and linking!)
     */

    var AutoLanguageInputController = function ($scope, $attrs, componentsService) {

        // Holds current validity state
        // @todo: just use delegation and check validity of every registered component
        var valid = true;

        AutoInputController.call(this, $scope, $attrs);

        //@todo: how does this work, can we be sure this is available?
        console.log('AUTO LANGUAGE INPUT CONTROLLER: ', this.$scope.optionData);
        //@todo: wrap this into the getSelectFields method
        this.select = this.$scope.optionData.tableName + '.*';

        console.log('AutoLanguageInputController: select is %o', this.select);
        this.formEvents             = formEvents;
        this.originalData           = undefined;
        this.registeredComponents   = [];
        this.subcomponentsService   = componentsService;


        // Key: id_language
        // Value			: {
        //	identifier		: 'name'
        // }
        // This structure is needed so that we can access the properties directly in the DOM
        // through ngmodel.
        this.$scope.locales = {};
        /**
         * @todo: pass the fields through the attributes
         * @todo: this is a different requirement than the other auto-input types have, I'd prefer to remove the
         *        language from the auto-input directive
         */
        $scope.fields = $scope.$eval(this.$scope.originalAttributes.fields);
        $scope.tableName = this.$scope.optionData.tableName;


        // Make data fit $scope.locales
        this.$scope.$on('dataUpdate', function (ev, data) {
            var locs = data[this.$scope.optionData.tableName];
            this.setData(locs);
        }.bind(this));


        // Used detailView. data-backoffice-label:
        // see $scope.isValid
        // @todo: delegate to the hosted components
        this.isValid = function () {
            return valid;
        };

        // Expose for back-office-label
        $scope.isValid = this.isValid;

        // Called from locale-component if validity changes.
        // @todo: use delegation
        $scope.setValidity = function (validity) {
            valid = validity;
        };


    };

    AutoLanguageInputController.prototype = Object.create(AutoInputController.prototype);
    AutoLanguageInputController.prototype.constructor = AutoLanguageInputController;
    AutoLanguageInputController.isValid = function(){

    };

    AutoLanguageInputController.prototype.registerAt = function(parent){
        parent.registerGetDataHandler(this.updateData.bind(this));
        //@todo: registerOptionDataHandler which extracts the tableName
    };

    AutoLanguageInputController.prototype.getSaveCalls = function () {

        // Make one call per changed language
        // url: /entity/id/language/id
        // Method: POST or PATCH (can't use PUT as it tries to re-establish an already
        // made connection on a unique relation)
        // DELETE is not needed (done through data)
        // data: identifier -> translation

        var ret = [];

        // Go through languages
        for (var i in this.$scope.locales) {

            var trans = this.$scope.locales[i]
                , langId = i;

            var url = 'language/' + langId;

            // Language didn't exist in originalData
            if (!this.originalData || !this.originalData[langId]) {

                ret.push({
                    method: 'POST'
                    , url: url
                    , data: this.$scope.locales[langId]
                });

            }

            // Get changed fields
            else {

                // Store changed fields
                var changed = {}
                    , hasChanged = false;


                // Go through fields (only the visible fields may have been changed)
                for (var n = 0; n < this.$scope.fields.length; n++) {

                    var fieldName = this.$scope.fields[n];

                    // Current field is not the same as it was at the beginning: Add to changed
                    if (this.$scope.locales[i][fieldName] !== this.originalData[i][fieldName]) {
                        changed[fieldName] = this.$scope.locales[i][fieldName];
                        hasChanged = true;
                    }

                }

                // There were changes to that language
                if (hasChanged) {
                    var method = this.originalData[langId] ? 'PATCH' : 'POST';
                    ret.push({
                        method: method
                        , data: changed
                        , url: url
                    });

                }

            }

        }

        return ret;

    };

    AutoLanguageInputController.prototype.updateData = function (data) {

        console.log('AutoLanguageInput: updateData got %o for tableName %o', data, data[this.$scope.optionData.tableName]);

        // No data available
        if (!data) {
            return;
        }
        // @todo: access the related table i.e. eventLocale
        var localeData = data[this.$scope.optionData.tableName];

        if (!(localeData && angular.isArray(localeData))) {
            console.error('AutoLanguageInput: data missing for locale. Key is %o, data is %o', this.$scope.optionData.tableName, data);
            return;
        }

        /**
         * Loop over the properties of the locale data.
         * All fields starting with 'id_' are relations to other entities.
         *
         * @todo: use the option data distinguish foreign keys instead of relying on the convention
         */
        localeData.forEach(function (locale) {

            var languageId = locale.id_language;
            if (!this.$scope.locales[languageId]) {
                this.$scope.locales[languageId] = {};
            }

            for (var property in locale) {
                if (property.substring(0, 3) === 'id_') continue;
                this.$scope.locales[languageId][property] = locale[property];
            }

        }, this);

        // Copy to originalData
        this.originalData = angular.copy(this.$scope.locales);
    };

    AutoLanguageInputController.prototype.init = function (el, detViewController) {
        this.element = el;
        this.detailViewController = detViewController;

        // Make entityId and entityName available to scope
        this.$scope.entityName = detViewController.getEntityName();
        this.$scope.entityId = detViewController.getEntityId();

        // Register myself @ detailViewController
        // -> I'll be notified on save and when data is gotten
        // this.detailViewController.register( this );

        // Call afterInit
        // E.g. replace current element with new directive (see relation-input). Can only be done
        // after the element has been initialized and data set
        if (this.afterInit && angular.isFunction(this.afterInit)) {
            this.afterInit();
        }

        // Check if updateData method was implemented.
        if (!this.updateData) {
            console.error('AutoInputController: updateData method missing in %o %o', this, el);
        }
        else {
            this.detailViewController.registerGetDataHandler(this.updateData.bind(this));
        }
    };

    AutoLanguageInputController.prototype.afterInit = function () {
        console.log('SCOPE OF LANGUAGE:', this.$scope);
        this.$scope.$emit(this.formEvents.registerComponent, this);
    };


    var _module;
    _module = angular.module('jb.backofficeAutoFormElement');
    _module.directive('autoLanguageInput', [function () {

            return {
                  scope: true
                , require: ['autoLanguageInput', '^detailView']
                , controller: 'AutoLanguageInputController'
                , link: function (scope, element, attrs, ctrl) {
                    ctrl[0].init(element, ctrl[1]);
                }
                /**
                 * Component itself is never required and always valid. Only single fields may be required or invalid.
                 * 1. tableName is set in this constructor coming from options call
                 * 2. locales is set in the controller, also based on the options data (added to the selects within the controllers constructor)
                 */
                , template:
                    '<div class="row">' +
                        '<div data-locale-component class="col-md-12" data-fields="fields" data-table-name="tableName" data-model="locales" data-set-validity="setValidity(validity)" data-entity-name="entityName"></div>' +
                    '</div>'
            };

        }]);

    _module.controller('AutoLanguageInputController', [
          '$scope'
        , '$attrs'
        , 'backofficeSubcomponentsService'
        , AutoLanguageInputController]);
})();







