package app.samo.android.audio

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Locks the FTS MATCH-expression builder to the JS predecessor's exact output
 * (`toFtsMatchQuery` in the deleted catalog-repository.ts): each whitespace
 * token becomes a quoted prefix term, embedded quotes double. Byte-identical
 * output means the ownership move cannot change what a given search matches.
 */
class SamoCatalogSearchTest {

    @Test
    fun `single token becomes quoted prefix term`() {
        assertEquals("\"beatles\"*", SamoCatalogSearch.buildMatchQuery("beatles"))
    }

    @Test
    fun `multiple tokens join with spaces`() {
        assertEquals(
            "\"mac\"* \"miller\"*",
            SamoCatalogSearch.buildMatchQuery("  mac   miller "),
        )
    }

    @Test
    fun `embedded quotes are doubled inside the quoted term`() {
        assertEquals(
            "\"the\"\"mark\"*",
            SamoCatalogSearch.buildMatchQuery("the\"mark"),
        )
    }

    @Test
    fun `blank input yields empty match`() {
        assertEquals("", SamoCatalogSearch.buildMatchQuery("   "))
    }
}
