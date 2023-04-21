import * as React from "react"
import { Link, graphql } from "gatsby"
import { GatsbyImage, getImage } from "gatsby-plugin-image"

import Bio from "../components/bio"
import Layout from "../components/layout"
import Seo from "../components/seo"

const ExerciseIndex = ({ data, location }) => {
  const siteTitle = data.site.siteMetadata?.title || `Title`
  const exercises = data.allMarkdownRemark.nodes.filter(
    node => node.fields.collection === `exercises`
  )
  if (exercises.length === 0) {
    return (
      <Layout location={location} title={siteTitle}>
        <p>
          No blog exercises found. Add markdown exercises to "content/blog" (or the
          directory you specified for the "gatsby-source-filesystem" plugin in
          gatsby-config.js).
        </p>
      </Layout>
    )
  }

  return (
    <Layout location={location} title={siteTitle}>
      <ol style={{ listStyle: `none` }}>
        {exercises.map(exercise => {
          const title = exercise.frontmatter.title || exercise.fields.slug
          const image = getImage(exercise.frontmatter.image)

          return (
            <li key={exercise.fields.slug}>
              <article
                className="exercise-list-item"
                itemScope
                itemType="http://schema.org/Article"
              >
                <header>
                  <GatsbyImage image={image} alt={exercise.frontmatter.alt} />
                </header>
                <section>
                  <p>{exercise.frontmatter.date}</p>
                  <p
                    dangerouslySetInnerHTML={{
                      __html: exercise.frontmatter.description || exercise.excerpt,
                    }}
                    itemProp="description"
                  />
                </section>
              </article>
            </li>
          )
        })}
      </ol>
    </Layout>
  )
}

export default ExerciseIndex

/**
 * Head export to define metadata for the page
 *
 * See: https://www.gatsbyjs.com/docs/reference/built-in-components/gatsby-head/
 */
export const Head = () => <Seo title="All exercises" />

export const pageQuery = graphql`
  {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        excerpt
        fields {
          slug
          collection
        }
        frontmatter {
          date(formatString: "MMMM DD, YYYY")
          title
          description
          alt
          image {
            childImageSharp {
            	gatsbyImageData(width: 200)
          	}
          }
        }
      }
    }
  }
`
