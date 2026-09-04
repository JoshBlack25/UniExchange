/*
 ICategoryService.java

 Service contract for Category.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.service.marketplace;

import za.ac.cput.domain.marketplace.Category;
import za.ac.cput.service.IService;

public interface ICategoryService extends IService<Category, Long> {

    Category findByName(String name);

}
