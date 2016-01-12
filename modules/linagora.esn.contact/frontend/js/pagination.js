'use strict';

angular.module('linagora.esn.contact')

  .factory('AddressBookPaginationProvider', function(ContactAPIClient, $log) {

    function AddressBookPaginationProvider(options) {
      this.addressbook = options.addressbook;
      this.id = this.addressbook.id;
      this.name = this.addressbook.name;
      this.options = options;
      this.lastPage = false;
      this.nextPage = 0;
    }

    AddressBookPaginationProvider.prototype.loadNextItems = function() {
      var self = this;

      var page = this.nextPage || 1;
      $log.debug('Load contacts page %s on ab', page, this.addressbook);

      return ContactAPIClient
        .addressbookHome(this.id)
        .addressbook(this.name)
        .vcard()
        .list({
          userId: this.options.user._id,
          page: page,
          paginate: true
        }).then(function(result) {
          self.lastPage = result.last_page;
          self.nextPage = result.next_page;
          return result;
        });
    };

    return AddressBookPaginationProvider;
  })

  .factory('SearchAddressBookPaginationProvider', function(ContactAPIClient, $log) {

    function SearchAddressBookPaginationProvider(options) {
      this.addressbook = options.addressbook;
      this.id = this.addressbook.id;
      this.name = this.addressbook.name;
      this.options = options;
      this.totalHits = 0;
      this.lastPage = false;
      this.nextPage = 0;
    }

    SearchAddressBookPaginationProvider.prototype.loadNextItems = function(options) {
      var self = this;
      var page = this.currentPage || 1;
      $log.debug('Search contacts page %s on ab', page, this.addressbook);

      var query = {
        data: options.searchInput,
        userId: this.options.user._id,
        page: page
      };

      return ContactAPIClient
        .addressbookHome(this.id)
        .addressbook(this.name)
        .vcard()
        .search(query)
        .then(function(result) {
          self.currentPage = result.current_page;
          self.totalHits = self.totalHits + result.hits_list.length;
          self.nextPage = result.next_page;
          if (self.totalHits === result.total_hits) {
            self.lastPage = true;
          }
          result.last_page = self.lastPage;
          return result;
        });
    };

    return SearchAddressBookPaginationProvider;
  })

  .factory('ContactShellComparator', function() {

    function byDisplayName(contact1, contact2) {
      return 0;
    }

    return {
      byDisplayName: byDisplayName
    };

  })

  .factory('AddressBookPaginationService', function() {

    function AddressBookPaginationService(paginable) {
      this.paginable = paginable;
      this.lastPage = false;
    }

    AddressBookPaginationService.prototype.loadNextItems = function(options) {
      var self = this;
      return this.paginable.loadNextItems(options).then(function(result) {
        self.lastPage = result.last_page;
        return result;
      });
    };

    return AddressBookPaginationService;
  })

  .factory('AddressBookPaginationFactory', function(AddressBookPaginationProvider, SearchAddressBookPaginationProvider, PageAggregatorService, ContactShellComparator, CONTACT_LIST_PAGE_SIZE) {

    function forMultipleAddressBooks(id, addressbooks, options) {
      var providers = addressbooks.map(function(addressbook) {
        return new AddressBookPaginationProvider(addressbook);
      });

      return new PageAggregatorService(id, providers, {
        compare: options.compare || ContactShellComparator.byDisplayName,
        results_per_page: CONTACT_LIST_PAGE_SIZE
      });
    }

    function forSearchAPI(addressbook) {
      return new SearchAddressBookPaginationProvider(addressbook);
    }

    function forSingleAddressBook(addressbook) {
      return new AddressBookPaginationProvider(addressbook);
    }

    return {
      forMultipleAddressBooks: forMultipleAddressBooks,
      forSearchAPI: forSearchAPI,
      forSingleAddressBook: forSingleAddressBook
    };

  })
  .factory('AddressBookPaginationHelper', function() {

    function LastPageWatcher($scope, addressBookPaginationService) {
      var self = this;
      this.$scope = $scope;
      this.addressBookPaginationService = addressBookPaginationService;

      this.unbindWatch = $scope.$watch(function() {
        return self.addressBookPaginationService.lastPage;
      }, function(newVal, oldVal) {
        if (newVal !== oldVal) {
          self.$scope.lastPage = newVal;
        }

        if (self.$scope.lastPage) {
          self.unbindWatch();
        }
      });
    }

    LastPageWatcher.prototype.stop = function() {
      this.unbindWatch();
    };

    return {
      LastPageWatcher: LastPageWatcher
    };
  });
