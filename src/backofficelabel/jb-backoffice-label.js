angular
.module( 'jb.backofficeAutoFormElement' )

.directive( 'backofficeLabel', [ '$templateCache', '$compile', function( $templateCache, $compile ) {
	return {
		link				: function( $scope, element, attrs, ctrl ) {

			
			var scope	= $scope.$new()
				, tpl	= $( $templateCache.get( 'backofficeLabelTemplate.html' ) );

			// Set validity to true for old components; in template, 
			// we test for !valid||!isValid
			scope.valid = true;

			// scope.required is used for old (auto) elements
			scope.required = scope.name = scope.entityName = undefined;

			$scope.entityName = ctrl[ 0 ].getEntityName();

			$scope.$watch( 'data', function( newValue ) {

				if( !newValue ) {
					scope.valid = scope.name = undefined;
					return;
				}

				scope.valid		= newValue.valid;
				scope.name		= newValue.name;
				console.log( 'backofficeLabel: Updated data %o', newValue );
			}, true );

			$scope.$watch( 'entityName', function( newValue ) {
				scope.entityName = newValue;
			} );

			$scope.$watch( 'optionData.required', function( newValue ) {
				scope.required = newValue;
			} );

			element.replaceWith( tpl );
			$compile( tpl )( scope );

		}
		, require: [ '^detailView' ]
		, scope: {
			labelIdentifier	: '@'
			, isRequired	: '&'
			, isValid		: '&'
		}
	};
} ] )

.run( function( $templateCache ) {
	$templateCache.put( 'backofficeLabelTemplate.html',
		'<label class=\'control-label col-md-3\' data-ng-class=\'{invalid: !isValid()}\'>{{checkValidity()}}' +
			'<span data-ng-if=\'isRequired()||required\' class=\'required-indicator \'>*</span>' +
			'<span data-translate=\'web.backoffice.{{ entityName }}.{{ labelIdentifier }}\'></span>' +
		'</label>'
	);
} );