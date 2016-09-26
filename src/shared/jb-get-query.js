(function(){
    "use strict";
    var mod = angular.module('jb.getQuery', []);
    function GetQuery(){

    }

    function QueryEndpoint(){
        this.select = function(fields){

        }.bind(this);
    }

    /**
     * query.get(entity)        -> the first time this is invoked the query is bound to the endpoint
     * query.select(this.name)  -> returns the query
     * query.select([])         ->
     * query.subselect(this.entityName) -> returns a new query builder with a new entry point
     */
})();