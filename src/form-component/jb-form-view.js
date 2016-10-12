(function (undefined) {
    'use strict';

    /**
     * Directive for every detail view:
     * - Gets field data from server (through an OPTIONS call)
     * - Input components (text, images, relations) may register themselves
     * - Stores data on server
     *
     * Child components must/may implement the following methods:
     * - register: When all components were registered, GET call is made.
     *             To be called after OPTION data was processed by component.
     * - registerOptionsDataHandler: get OPTION data (optional)
     * - registerGetDataHandler: get GET data (optional)
     * - getSaveCalls: Returns POST calls (optional)
     * - isValid: Returns true if component is valid (optional)
     * - getSelectFields: Returns select fields (replaces the select property)
     */

    var _module = angular.module('jb.formComponents');

    _module.directive('jbFormView', [function () {

        return {
            link: {
                pre: function (scope, element, attrs, ctrl) {
                    if (angular.isFunction(ctrl.preLink)) {
                        ctrl.preLink(scope, element, attrs);
                    }
                }
                , post: function (scope, element, attrs, ctrl) {
                    element.addClass('jb-form-view');
                    ctrl.init(scope, element, attrs);
                }

            }
            , controller        : 'DetailViewController'
            , bindToController  : true
            , controllerAs      : '$ctrl'

            /**
             * We cannot use an isolated scope here: the nested elements would be attached to the parent scope
             * and we would not be able to listen to the corresponding events.
             *
             *  {
                 *        'entityName'  : '<'
                 *      , 'entityId'    : '<'
                 *      , 'isRoot'      :
                 *  }
             */
            , scope: true
        };

    }]);
    /**
     * @todo: do a clean implementation!
     */
    function DetailViewController($scope, $rootScope, $q, $filter, $state, APIWrapperService, subcomponentsService, boAPIWrapper) {
        this.$scope             = $scope;
        this.$rootScope         = $rootScope;
        this.$q                 = $q;
        this.$filter            = $filter;
        this.$state             = $state;
        this.api                = APIWrapperService;
        this.boAPI              = boAPIWrapper;
        this.componentsService  = subcomponentsService;
        // this will be resolved in the linking phase
        this.componentsRegistry = null;
    }

    DetailViewController.prototype.init = function(scope, element, attrs){

    };

    _module.controller('DetailViewController',
        [
            '$scope'
            , '$rootScope'
            , '$q'
            , '$attrs'
            , '$filter'
            , '$state'
            , 'APIWrapperService'
            , 'JBFormComponentsService'
            , 'BackofficeAPIWrapperService'
            , function ($scope, $rootScope, $q, $attrs, $filter, $state, APIWrapperService, subcomponentsService, boAPIWrapper) {


            /**
             * Private vars
             */

            var self = this
                , element;

            self.componentsService  = subcomponentsService;
            self.componentsRegistry = null;
            /**
             * Data we loaded ourselves.
             */
            self.optionData         = null;
            /**
             * Data we got by distribution.
             */
            self.parentOptionData   = null;

            $scope.$watchGroup(['$ctrl.entityName', '$ctrl.entityId'], function () {
                self.setTitle();
            });

            /**
             * Set up the registry waiting for subcomponents in the pre-link phase.
             */
            self.preLink = function (scope, element, attrs) {
                self.componentsRegistry = self.componentsService.registryFor(scope);
                self.componentsRegistry.listen();
            };

            /**
             * Extracts the global entityName and entityId from the $state service.
             */
            self.parseUrl = function () {
                return {
                    name: $state.params.entityName
                    // Only return id if it's an ID (and not 'new'). If we return «new», a GET request will be made to /entityName/new
                    ,
                    id: ( $state.params.entityId && $state.params.entityId !== 'new' ) ? $state.params.entityId : false
                    ,
                    isNew: $state.params.entityId === 'new' ? true : false
                };

            };

            self.getEntityId = function () {
                return $scope.entityId;
            };

            self.getEntityName = function () {
                return $scope.entityName;
            };

            self.getEntityUrl = function () {
                var url = '/' + self.getEntityName();
                if (self.getEntityId()) {
                    url += '/' + self.getEntityId();
                }
                return url;
            };

            /**
             * Title
             * @todo: Remove the dependency to the state in here
             */

            self.setTitle = function () {
                var   titleSuffix = self.getEntityName()
                    , titlePrefix = $filter('translate')('web.backoffice.create');

                if (self.entityId) {
                    titlePrefix = $filter('translate')('web.backoffice.edit');
                    titleSuffix = titleSuffix + ' #'+ self.entityId;
                }
                $scope.title = [titlePrefix , titleSuffix].join(': ');
            };

            /**
             * Init (called from directive's link function)
             * Components of interest (old version):
             *  - data-auto-form-element
             *  - data-hidden-input
             *  - data-backoffice-tree-component
             *  - data-backoffice-relation-component
             *  - data-backoffice-component
             *  - data-backoffice-image-component
             *  - data-backoffice-image-detail-component
             *  - data-backoffice-video-component
             *  - data-backoffice-date-component
             *  - data-backoffice-media-group-component
             *  - data-backoffice-data-component
             */

            self.init = function (scope, el, attrs) {
                var promises = [];
                element = el;
                /**
                 * Observe these values.
                 * 1. If there is no entity name and id set, load it from the state, and set the value (is the isRoot property important then?).
                 * 2. If there is an entity name and no id, try to extract the primary key from the get data.
                 * 3. If both are present, wait for them to be updated.
                 *
                 * @todo: can we detect if we are root by checking if 'registerAt' was called?
                 */
                self.isRoot         = attrs.hasOwnProperty('isRoot');
                self.hasEntityName  = attrs.hasOwnProperty('entityName');
                self.hasEntityId    = attrs.hasOwnProperty('entityId');

                if (self.hasEntityName) {
                    var nameDeferred = $q.defer();
                    promises.push(nameDeferred.promise);
                    scope.$watch(function(){ return attrs.entityName; } , function (value) {
                        console.info(value);
                        if(!value) return;
                        self.setEntityName(value);
                        nameDeferred.resolve();
                    });
                }

                if (self.hasEntityId) {
                    var idDeferred = $q.defer();
                    promises.push(idDeferred.promise);
                    scope.$watch(function(){ return attrs.entityId; }, function (value) {
                        self.setEntityId(value);
                        idDeferred.resolve();
                    });
                }

                if (!self.hasEntityName && !self.hasEntityId) {
                    var stateParams = self.parseUrl();
                    self.setEntityName(stateParams.name);
                    self.setEntityId(stateParams.id);
                }
                // register myself as a component to possible parents
                self.componentsService.registerComponent(scope, this);

                $q.all(promises).then(function () {
                    // load option data if we are root
                    if (self.isRoot) self.getOptionData().then(self.getData).catch(function(err){
                        console.error(err);
                    });
                });
            };

            self.setEntityName = function (name) {
                self.entityName = name;
                $scope.entityName = name;
            };

            self.setEntityId = function (id) {
                self.entityId = id;
                $scope.entityId = id;
            };

            self.registerAt = function (parent) {
                parent.registerOptionsDataHandler(self.handleOptionsData);
                parent.registerGetDataHandler(self.handleGetData);
            };

            /**
             * Also, we have to differ between:
             *
             *  1. hasOne       : just take the value
             *  2. belongsTo    : take the first of the values
             *
             * @param data
             */
            self.handleGetData = function (data) {
                var ownData = data[self.entityName];
                if (!angular.isDefined(ownData)) console.error('No data available for related %o', self.entityName);
                // ugh we might get the entityId through the scope!! yes we do!
                if (!self.entityId && ownData) {
                    var pKey = self.parentOptionData.relatedKey;
                    self.setEntityId(ownData[pKey]);
                }
                if(!self.entityId && !ownData){
                    self.setEntityId(undefined);
                }
                self.distributeData(ownData);
            };

            self.getSaveCalls = function () {
                var call = {};
                call.data = {};
                call.data[self.parentOptionData.relationKey] = self.getEntityId();
                return [call];
            };
            /**
             * This is shitty! We need to load more options data as soon as we receive the options to to be able to
             * distribute options to the nested fields.
             * @param fields
             */
            self.internallyHandleOptionsData = function (data) {
                self.optionData = data;
                return self.componentsRegistry.optionsDataHandler(data);
            };
            /**
             * These are passed in from outside (nested detail view).
             * @param data
             * We need to differ between:
             *
             *  1. hasOne:      set the foreign key on the original entity (pre save task)
             *  2. belongsTo:   set the foreign key of the referenced entity (post save task)
             *
             * @todo: make adjustments to the optionData
             */
            self.handleOptionsData = function (data) {
                var optionData = data[self.entityName];
                self.parentOptionData = optionData;
                return self.getOptionData();
            };

            /**
             * OPTION data
             */
            self.getOptionData = function () {

                console.log('DetailView: Make OPTIONS call for %o', self.getEntityName());
                return self
                    .makeOptionRequest('/' + self.getEntityName())
                    .then(
                    self.internallyHandleOptionsData
                    , function (err) {
                        $rootScope.$broadcast('notification', {
                            'type': 'error'
                            , 'message': 'web.backoffice.detail.optionsLoadingError'
                            , variables: {errorMessage: err}
                        });

                    });

            };

            /**
             * Makes options call, sets self.fields
             * @todo: check if the fields are used somewhere
             */
            self.makeOptionRequest = function (url) {
                return boAPIWrapper.getOptions(url);
            };

            /**
             * Use the events for that.
             */
            self.register = function (el) {
                throw new Error('DEPRECATED');
            };

            /**
             * Make a GET request to the API, selecting all the fields the subcomponents request.
             */
            self.getData = function () {
                self
                    .makeGetRequest()
                    .then(
                    self.distributeData
                    , function (err) {
                        $rootScope.$broadcast('notification', {
                            type: 'error'
                            , message: 'web.backoffice.detail.loadingError'
                            , variables: {
                                errorMessage: err
                            }
                        });
                    });

            };

            /**
             * Collects the select fields of all the registered subcomponents. This is the internal API.
             * @returns {Array}
             */
            self.getSelectParameters = function () {
                return self.componentsRegistry.getSelectFields();
            };

            /**
             * Collects the select fields if the detail view is nested. This is the external API.
             * @returns {Array}
             */
            self.getSelectFields = function () {
                return self.getSelectParameters().map(function (select) {
                    return [this.getEntityName(), select].join('.');
                }.bind(this));
            };

            /**
             * Distributes the entity data (from the GET call) to the registered subcomponents by delegating
             * to the getDataHandler of the registry.
             */
            self.distributeData = function (data) {
                self.componentsRegistry.getDataHandler(data);
            };


            /**
             * Get data for current entity from server, fire dateUpdate. Done after changes were saved.
             */
            self.updateData = function () {

                return self
                    .makeGetRequest()
                    .then(function (data) {

                        self.distributeData(data);
                        return data;

                    }, function (err) {
                        $rootScope.$broadcast('notification', {
                            type: 'error'
                            , message: 'web.backoffice.detail.saveError'
                            , variables: {
                                errorMessage: err
                            }
                        });
                        return $q.reject(err);
                    });
            };


            /**
             * Gets current entity's data through GET call
             */
            self.makeGetRequest = function () {

                var url = self.getEntityUrl()
                    , select = self.getSelectParameters();

                console.log('DetailView: Get Data from %o with select %o', url, select);

                return APIWrapperService.request({
                    url: url
                    , headers: {select: select}
                    , method: 'GET'
                }).then(
                    function (data) {
                        return data;
                    }.bind(this)
                    , function (err) {
                        return $q.reject(err);
                    });

            };

            ///////////////////////////////////////////////////////////////////////////////////////////////
            //
            // Save
            //

            /**
             * Called when user clicks 'save'. Can be called manually through scope().
             *
             * @param <Boolean> dontNotifyOrRedirect            If true, no notification is shown and on successful creation, user is
             *                                                _not_ redirected to the new entity. Needed for manual saving.
             * @returns <Integer>                            ID of the current entity
             */
            $scope.save = function (dontNotifyOrRedirect, ev, callback) {

                // Needed for nested detailViews: We don't want to propagate the save event to the parent detailView
                // See e.g. article in CC back office
                if (ev && angular.isFunction(ev.preventDefault)) {
                    ev.preventDefault();
                }

                // We need to get the saved entity's id so that we can redirect the user to it
                // after it has been created (when user was on /entity/new)
                // Can't be returned, as we're using promises. Therefore pass an object to the save
                // call that will be filled with the id
                /*var returnValue = {
                 id: undefined
                 };*/

                return self
                    .makeSaveRequest(self.registeredComponents, self.getEntityName())
                    .then(function (entityId) {

                        // Entity didn't have an ID (was newly created): Redirect to new entity
                        if (self.parseUrl().isNew && !dontNotifyOrRedirect) {
                            $state.go('app.detail', {entityName: self.getEntityName(), entityId: self.getEntityId()});
                        }
                        // Do notify and redirect
                        if (!dontNotifyOrRedirect) {
                            console.log('DetailViewController: Show success message on %o', $rootScope);
                            $rootScope.$broadcast('notification', {
                                type: 'success'
                                , message: 'web.backoffice.detail.saveSuccess'
                            });
                        }
                        else {
                            console.log('DetailViewController: Don\'t show any message or redirect');
                        }

                        self.updateData();

                        return entityId || null;


                    }).catch(function(err) {

                            $rootScope.$broadcast('notification', {
                                type: 'error'
                                , message: 'web.backoffice.detail.saveError'
                                , variables: {
                                    errorMessage: err.message
                                }
                            });

                            return $q.reject(err);
                    });

            };

            self.isValid = function () {
                return self.componentsRegistry.isValid()
            };
            /**
             * Stores all component's data on server
             */
            self.makeSaveRequest = function () {

                if (!self.isValid()) return $q.reject(new Error('Not all required fields filled out.'));

                // Pre-save tasks (upload images)
                return self.executePreSaveTasks()

                    // Save stuff on current entity
                    .then(function (entity) {
                        // current entity state
                        return self.makeMainSaveCall();
                    })
                    .then(function () {
                        return self.executePostSaveTasks();
                    });

            };

            /**
             * Executes tasks that must be done before the current entity is saved, i.e.
             * create all entities that will be linked to this entity afterwards, like e.g.
             * upload an image
             * Calls beforeSaveTasks on registered components. They must return a promise.
             */
            self.executePreSaveTasks = function () {
                var entity  = {};
                entity.meta = {};
                return self.componentsRegistry.getBeforeSaveTasks(entity);
            };
            /**
             * This is the external api!
             * @param entity
             */
            self.beforeSaveTasks = function(entity){
                var task = self.makeSaveRequest();
                return task;
            };

            /**
             * Executes save tasks that must be executed after the main entity was created,
             * e.g. save the order of images in a mediaGroup:
             * 1. Save main entity (done through regular save call)
             * 2. Update media links (/mediumGroup/id/medium/id) (done through regular save call)
             * 3. Update order (GET all media from /mediumGroup, then set order on every single relation)
             */
            self.executePostSaveTasks = function () {
                return self.componentsRegistry.getAfterSaveTasks();
            };

            self.getOwnId = function(data) {
                if(!data) return null;
                var keys = Object.keys(this.optionData.internalFields);
                for(var i=0; i<keys.length; i++){
                    var field = this.optionData.internalFields[keys[i]];
                    if(field.isPrimary === true) return data[keys[i]];
                }
                return null;
            };
            /**
             * Saves:
             * - first, the data on the entity (creates entity, if not yet done)
             *   by doing all calls going to /
             * - second, all other things (e.g. relations that need the entity to be
             *   existent)
             * @return Promise        Parameter passed is null or mainEntity's id
             *
             * @todo: pre save tasks should create related entities and set the relation id (hasOne) (or set the field values)
             * @todo: the main call should only save/create the current entity
             * @todo: the post save tasks should create relations having access to the previously saved id (store it into a meta parameter)
             */
            self.makeMainSaveCall = function () {
                var calls = self.generateSaveCalls();
                console.log('DetailView: Save calls are %o', calls);

                var mainCall
                    , relationCalls = []
                    , mainCallData;

                // Split calls up in mainCall, needs to be done first
                // (main entity needs to be created before relations can be set)
                // Main calls start with /entityName or /entityName/entityId (for updates)
                // /entityName/entityId must be covered in case of redirects. Subsequent calls
                // to releations must be made to the new entityId.
                for (var i = 0; i < calls.length; i++) {

                    // If url is an object it should never be a call to the mainEnity (as mainEntity: append or prepend will be
                    // used and therefore a relation be created.
                    if (
                        !angular.isObject(calls[i].url) &&
                        (
                            !calls[i].url ||
                            calls[i].url.indexOf('/' + self.getEntityName()) === 0
                        )
                    ) {
                        mainCall = calls[i];
                    }

                    else {
                        relationCalls.push(calls[i]);
                    }

                }

                // entityId not yet set: New element – but has no fields or no required fields,
                // therefore no information might be provided, except for some relations.
                // If entity is not generated (what would happen as there's no data to store),
                // relations could not be created (POST to /entityName/otherEntityName/otherEntityId)
                // would fail, as entityId doesn't exist.
                if (!mainCall && !self.getEntityId()) {
                    mainCall = {
                        method: 'POST'
                        , url: '/' + self.getEntityName()
                    };
                }

                console.log('DetailView: Main save call is %o, other calls are %o', mainCall, relationCalls);
                var id = null;
                // Make main call
                return self.executeSaveRequest(mainCall)

                    // Make all secondary calls (to sub entities) simultaneously
                    .then(function (mainCallResult) {

                        // Make mainCallData available to next promise
                        mainCallData = mainCallResult;

                        console.log('DetailView: Made main save call; got back %o', mainCallData);

                        // Pass id of newly created object back to the Controller
                        // so that user can be redirected to new entity
                        id = self.getOwnId(mainCallData);
                        self.setEntityId(id);

                        var callRequests = [];
                        relationCalls.forEach(function (call) {
                            callRequests.push(self.executeSaveRequest(call));
                        });

                        return $q.all(callRequests);

                    })

                    // Make sure we pass back the id.
                    .then(function () {
                        console.log('DetailView: Made call to the main entity; return it\'s id %o', id);
                        return id;
                    });


            };


            /**
             * Adds the call componentCall gotten from a registered component to the
             * calls variable that's sorted by urls and methods.
             * Therefore, if multiple calls to the same url exists, it groups them together
             * by an array item on calls and composes the data.
             */
            self.addCall = function (componentCall, calls) {

                // Components may pass back just a data field – means that it's stored on the entity itself.
                // Get url from self.getEntityUrl, as it is needed to determine the method of the call
                // (PATCH or POST).
                if (!componentCall.url) {
                    componentCall.url = self.getEntityUrl();
                }


                // Method's missing
                if (!componentCall.method) {

                    // Test if URL has an ID (ends with /12329)
                    // If it does, use patch, else post.
                    if (/\/\d*\/?$/.test(componentCall.url)) {
                        componentCall.method = 'PATCH';
                    }
                    else {
                        componentCall.method = 'POST';
                    }
                }

                // Check if call to url does already exit
                var call = this.getSaveCall(calls, componentCall.method, componentCall.url);

                // If componentCall has headers, treat it as a different call. To improve, we might
                // compare headers, but let's save that for better times.
                // Headers are e.g. used in treeFormData to store a tree (needs Content-Type: application/json)
                if (componentCall.hasOwnProperty('headers')) {
                    call = false;
                }

                // Call doesn't yet exist
                if (!call) {
                    call = {
                        method: componentCall.method
                        , url: componentCall.url
                        , data: componentCall.data
                        , headers: componentCall.headers || {}
                    };
                    calls.push(call);
                }

                // Add data
                else {

                    // Don't do that if we're sending a string or array (e.g. when using application/json as Content-Type
                    if (componentCall.data) {
                        for (var p in componentCall.data) {
                            call.data[p] = componentCall.data[p];
                        }
                    }

                }

            };


            /**
             * Check if a call to method and url does already exist in calls. If it does, return it,
             * else return false
             * @param <Array> calls            Array of calls
             * @pparam <String> method
             * @param <String> url
             */
            self.getSaveCall = function (calls, method, url) {

                // Default: empty array, if not found
                var saveCall = false;
                calls.some(function (call) {
                    // Check if URL is the same. Normally use === comparator.
                    // But if URL is not set, it might be false or '', therefore
                    // use == comparator.
                    var sameUrl = call.url === url || ( !call.url && !url )
                        , sameMethod = call.method.toLowerCase() === method.toLowerCase();
                    if (sameMethod && sameUrl) {
                        saveCall = call;
                        return true;
                    }
                });
                return saveCall;

            };


            /**
             * Makes POST or PATCH call to server to store data.
             * @param <Object> data            Key: URL to be called
             *                                Value: Data to be sent
             * @param <String> basePath        The current entity's path (e.g. /event/18),
             *                                needed to generate calls to relative URLs
             * @return <Promise>                Promise of the corresponding call
             */
            self.executeSaveRequest = function (call) {

                // Empty call (if there's no call to / to be made, e.g.)
                // Just resolve the promise
                if (!call) {
                    console.log('DetailView: No call to be made');
                    return $q.when(call);
                }

                // url
                // - Take current url + url, if it's relative (doesn't start with a /)
                // - Take url if it's absolute (starts with a /)
                var url;


                //
                // Generate final URL
                //


                // Object

                if (angular.isObject(call.url)) {

                    // url.path missing – needs to be set if url is an object
                    if (!call.url.path) {
                        console.error('DetailViewController: url property is missing on path on %o', call);
                        return $q.reject('Got invalid call data, path property missing on url for ' + JSON.stringify(call));
                    }

                    // entityName/entityId or entityName
                    var mainEntityUrl = self.getEntityId() ?
                    self.getEntityName() + '/' + self.getEntityId() :
                        self.getEntityName();

                    // Remove trailing and leading slashes
                    var path = call.url.path.replace(/^\/*/, '').replace(/\/*$/, '');

                    if (call.url.mainEntity === 'prepend') {

                        url = '/' + mainEntityUrl + '/' + path;

                    }
                    else if (call.url.mainEntity === 'append') {

                        url = '/' + path + '/' + mainEntityUrl;

                    }

                    else {
                        url = call.url.path;
                    }

                }



                // Absolute call!

                else if (call.url && call.url.indexOf('/') === 0) {

                    url = call.url;

                }


                // Relative URL

                else {

                    url = '/' + self.getEntityName();

                    // Only use entity's ID if it exists (i.e. we're not newly creating an entity)
                    if (self.getEntityId()) {
                        url += '/' + self.getEntityId();
                    }

                    // Append call.url, if available
                    if (call.url) {
                        url += '/' + call.url;
                    }

                }

                console.log('DetailView: Make %s call to %s with %o. Call is %o, entityName is %o.', call.method, url, call.data, call, self.getEntityName());

                // Add datasourceId as long as it's needed
                // #todo remove when eE's ready
                if (!call.data) {
                    call.data = {};
                }

                return APIWrapperService.request({
                    url: url
                    , data: call.data
                    , method: call.method
                    , headers: call.headers
                });

            };


            /**
             * Goes through all inputs, collects their save calls (by calling getSaveCalls)
             *
             * getSaveCalls() may return:
             * - false (no call to be made)
             * - an array of objects or single object, where each object has the following properties
             *     - url (mandatory): URL to be called as
             *           - a <String>: If prefixed with a /, will be an absolute path, else relative to the
             *             current entity
             *           - an <Object> with the properties
             *                   - path <String>: path
             *                   - baseEntity <String> 'append|prepend' Whether and where to append
             *                     the current entity plus its ID. If not set or another value,
             *                     current entity is not used at all.
             *     - method (mandatory, <String>): method to be used (GET,PATCH,POST)
             *     - headers (optional, <Object>): an object of headers, e.g. { range: '0-10' }
             *     - data (optional <Object>): data to be sent with a POST or PATCH request
             * - a Promise
             */
            self.generateSaveCalls = function () {
                var saveCalls = self.componentsRegistry.getSaveCalls().reduce(function (calls, componentCalls) {
                    self.addCall(componentCalls, calls);
                    return calls;
                }, []);
                return saveCalls;
            };


            ///////////////////////////////////////////////////////////////////////////////////////////////
            //
            // DELETE
            //

            /**
             * Deletes the entity.
             * @todo: the redirection should not be a matter of the detail-view itself, if we have nested detail
             * @param <Boolean> nonInteractive        True if user should not be redirected to main view
             */
            $scope.delete = function (nonInteractive) {

                console.log('DetailView: Delete');

                // Display confirmation dialog – must be done in interactive and non-interactive mode
                var confirmed = confirm($filter('translate')('web.backoffice.detail.confirmDeletion'));

                if (!confirmed) {
                    return;
                }

                return self
                    .makeDeleteRequest()
                    .then(function (data) {

                        // Go to entity's list view
                        if (!nonInteractive) {

                            $state.go('app.list', {entityName: self.getEntityName()});

                            $rootScope.$broadcast('notification', {
                                type: 'success'
                                , message: 'web.backoffice.detail.deleteSuccess'
                            });

                        }

                        // Resolve promise
                        return true;

                    }, function (err) {

                        if (!nonInteractive) {
                            $rootScope.$broadcast('notification', {
                                type: 'error'
                                , message: 'web.backoffice.detail.deleteError'
                                , variables: {
                                    errorMessage: err
                                }
                            });
                        }

                        return $q.reject(err);

                    });

            };


            /**
             * Delete an entity
             */
            self.makeDeleteRequest = function () {

                console.log('DetailView: Make DELETE request');

                return APIWrapperService.request({
                    url: '/' + self.getEntityName() + '/' + self.getEntityId()
                    , method: 'DELETE'
                });
            };


        }]);
})();