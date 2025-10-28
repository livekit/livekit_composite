package main

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDomainValidation(t *testing.T) {
	testCases := []struct {
		domain string
		valid  bool
	}{
		{
			"toplevel.com", true,
		},
		{
			"invalid", false,
		},
		{
			"a.subdomain.co", true,
		},
		{
			"company.co.uk", true,
		},
		{
			"sub.sub.domain.com", true,
		},
		{
			"123.456", false,
		},
	}

	t.Parallel()
	for _, tc := range testCases {
		t.Run(tc.domain, func(t *testing.T) {
			require.Equal(t, tc.valid, domainRegexp.MatchString(tc.domain))
		})
	}
}
