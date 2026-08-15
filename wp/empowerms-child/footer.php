<?php
/**
 * Closes the main landmark, renders the Elementor footer location, and fires
 * wp_footer(). See header.php for why the location call is here rather than
 * inherited.
 *
 * @package EmpowerMississippi
 */

?>
</main>

<?php
empower_do_elementor_location( 'footer' );

wp_footer();
?>
</body>
</html>
