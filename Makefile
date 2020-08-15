MAIN_JS_FILE := main.js

all:
	# format everything
	npx prettier --single-quote false --html-whitespace-sensitivity strict --no-bracket-spacing --quote-props preserve --trailing-comma all --write --tab-width 4 *.js tests/*.html
	# clear terminal
	reset
	# run browser
	node "${MAIN_JS_FILE}"

