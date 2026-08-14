with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

# Add the missing closing </div> for <div className="flex items-center w-full max-w-xl gap-3">
# Need to find where the searchRef div closes.

content = content.replace(
    '''              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end w-full sm:w-auto gap-4 sm:gap-6">''',
    '''              )}
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="flex items-center justify-end w-full sm:w-auto gap-4 sm:gap-6">'''
)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)
