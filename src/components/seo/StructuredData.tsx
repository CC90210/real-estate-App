
export function OrganizationSchema() {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'PropFlow',
        url: 'https://propflow.io',
        logo: 'https://propflow.io/logo.png',
        description: 'Property management software for real estate professionals',
        foundingDate: '2024',
        founders: [{
            '@type': 'Person',
            name: 'PropFlow Team'
        }],
        address: {
            '@type': 'PostalAddress',
            addressLocality: 'Toronto',
            addressRegion: 'ON',
            addressCountry: 'CA'
        },
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: 'support@propflow.io'
        },
        sameAs: [
            'https://twitter.com/propflow',
            'https://linkedin.com/company/propflow',
            'https://facebook.com/propflow'
        ]
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

export function SoftwareApplicationSchema() {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'PropFlow',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
            '@type': 'AggregateOffer',
            lowPrice: '49',
            highPrice: '249',
            priceCurrency: 'USD',
            offerCount: '3'
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '150'
        },
        description: 'Property management software for leasing agents, property managers, and landlords.',
        featureList: [
            'Property Management',
            'Tenant Screening',
            'Lease Generation',
            'Application Tracking',
            'Showing Scheduler',
            'Invoice Management',
            'Team Collaboration',
            'Analytics Dashboard'
        ]
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url
        }))
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    )
}
