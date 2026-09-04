/*
 ICampusService.java

 Service contract for Campus.

 Author: <Your Full Name> (<Student Number>)
 Date: 04 September 2026
*/

package za.ac.cput.service.identity;

import java.util.List;

import za.ac.cput.domain.identity.Campus;
import za.ac.cput.service.IService;

public interface ICampusService extends IService<Campus, Long> {

    List<Campus> findByCity(String city);

}
