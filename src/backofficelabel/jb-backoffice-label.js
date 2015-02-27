angular
.module( 'jb.backofficeAutoFormElement' )

.directive( 'backofficeLabel', [ '$templateCache', '$compile', function( $templateCache, $compile ) {
	return {
		link				: function( $scope, element, attrs ) {

			var scope	= $scope.$new()
				, tpl	= $( $templateCache.get( 'backofficeLabelTemplate.html' ) );

			scope.valid = scope.required = scope.name = scope.entityName = undefined;


			$scope.$watch( 'data', function( newValue ) {

				if( !newValue ) {
					scope.valid = scope.name = undefined;
					return;
				}

				scope.valid		= newValue.valid;
				scope.name		= newValue.name;
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
	};
} ] )

.run( function( $templateCache ) {
	$templateCache.put( 'backofficeLabelTemplate.html',
		'<label class=\'control-label col-md-3\' data-ng-class=\'{invalid: !valid}\'>' +
			'<span data-ng-if=\'required\' class=\'required-indicator \'>*</span>' +
			'<span data-translate=\'web.backoffice.{{ entityName }}.{{ name }}\'></span>' +
		'</label>'
	);
} );